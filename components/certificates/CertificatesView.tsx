import React, { useState, useEffect } from 'react';
import { 
    Calendar as CalendarIcon, 
    Search, 
    Check, 
    Award, 
    ExternalLink, 
    Star, 
    Users, 
    Plus, 
    Loader2, 
    X, 
    CheckCircle, 
    School, 
    Sparkles, 
    AlertTriangle,
    Filter
} from 'lucide-react';
import { RecognitionGenerator } from '../recognition/RecognitionGenerator';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type TabType = 'events' | 'training' | 'recognitions';

export function CertificatesView() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('events');
    const [loading, setLoading] = useState(true);
    const [eventCertificates, setEventCertificates] = useState<any[]>([]);
    const [courseCertificates, setCourseCertificates] = useState<any[]>([]);
    const [recognitions, setRecognitions] = useState<any[]>([]);
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showRecognitionModal, setShowRecognitionModal] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab, selectedEventId]);

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        const { data } = await supabase.from('events').select('id, title').order('scheduled_date', { ascending: false });
        if (data) setAllEvents(data);
    }

    async function loadData() {
        setLoading(true);
        try {
            if (activeTab === 'events') {
                let query = supabase
                    .from('event_participants')
                    .select(`
                        id,
                        full_name,
                        category,
                        certificate_url,
                        registered_at,
                        event_id,
                        events (title, scheduled_date)
                    `);
                
                if (selectedEventId !== 'all') {
                    query = query.eq('event_id', selectedEventId);
                }
                // Eliminamos el filtro de 'not null' para que el docente vea a quién le falta el certificado

                const { data, error } = await query.order('registered_at', { ascending: false });
                if (error) {
                    setFetchError(error.message);
                    throw error;
                }
                setEventCertificates(data || []);
                setFetchError(null);
            } else if (activeTab === 'training') {
                const { data, error } = await supabase
                    .from('certificates')
                    .select(`
                        *,
                        profiles:user_id (full_name),
                        courses (title)
                    `)
                    .eq('type', 'curso')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setCourseCertificates(data || []);
            } else if (activeTab === 'recognitions') {
                const { data, error } = await supabase
                    .from('certificates')
                    .select(`
                        *,
                        profiles:user_id (full_name, role)
                    `)
                    .eq('type', 'reconocimiento')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setRecognitions(data || []);
            }
        } catch (error) {
            console.error('Error loading certificates data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveRecognition(data: any) {
        try {
            const { error } = await supabase
                .from('certificates')
                .insert([{
                    user_id: data.user_id,
                    type: 'reconocimiento',
                    pdf_url: data.pdf_url,
                    certificate_code: `REC-${Date.now().toString().slice(-6)}`,
                    metadata: {
                        title: data.title,
                        description: data.description,
                        issue_date: data.issue_date
                    }
                }]);

            if (error) throw error;
            setShowRecognitionModal(false);
            loadData();
            alert('✅ Reconocimiento emitido correctamente');
        } catch (error: any) {
            console.error('Error saving recognition:', error);
            alert('❌ Error al emitir reconocimiento: ' + error.message);
        }
    }

    return (
        <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-exec-border pb-4">
            <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                    <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                        <Award className="w-6 h-6 text-exec-blue" />
                    </div>
                    <span>Gestión de <span className="text-exec-blue">Certificados</span></span>
                </h1>
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Administra y emite certificados institucionales del equipo.</p>
            </div>

            {user?.role === 'Director' && activeTab === 'recognitions' && (
                <button 
                    onClick={() => setShowRecognitionModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-none bg-exec-blue hover:bg-blue-500 text-white transition-all shadow-lg shadow-exec-blue/20 text-[11px] font-bold uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4" />
                    Emitir Reconocimiento
                </button>
            )}
        </div>

            {fetchError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-none text-red-500 text-sm flex items-center gap-3">
                    <X className="w-4 h-4" />
                    <span>Error de sincronización: {fetchError}</span>
                    <button onClick={() => loadData()} className="ml-auto underline font-bold">Reintentar</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[#111] p-1 rounded-none border border-exec-border w-fit">
                <button
                    onClick={() => setActiveTab('events')}
                    className={`px-4 py-2 text-sm font-medium rounded-none transition-all flex items-center gap-2 ${activeTab === 'events' ? 'bg-[#1A1A1A] text-white border border-exec-border' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Users className="w-4 h-4" />
                    Eventos
                </button>
                <button
                    onClick={() => setActiveTab('training')}
                    className={`px-4 py-2 text-sm font-medium rounded-none transition-all flex items-center gap-2 ${activeTab === 'training' ? 'bg-[#1A1A1A] text-white border border-exec-border' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <School className="w-4 h-4" />
                    Capacitaciones
                </button>
                <button
                    onClick={() => setActiveTab('recognitions')}
                    className={`px-4 py-2 text-sm font-medium rounded-none transition-all flex items-center gap-2 ${activeTab === 'recognitions' ? 'bg-[#1A1A1A] text-white border border-exec-border' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Star className="w-4 h-4" />
                    Reconocimientos
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar participante o evento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#111] border border-exec-border rounded-none text-sm text-white outline-none focus:border-exec-blue"
                    />
                </div>

                {activeTab === 'events' && (
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="bg-[#111] border border-exec-border rounded-none text-sm text-white px-3 py-2 outline-none focus:border-exec-blue min-w-[200px]"
                        >
                            <option value="all">Todos los certificados</option>
                            {allEvents.map(evt => (
                                <option key={evt.id} value={evt.id}>{evt.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-exec-blue" /></div>
            ) : activeTab === 'events' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(
                        eventCertificates
                            .filter(c => c.certificate_url) // Solo emitidos
                            .filter(c => 
                                c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (c.events as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .reduce((acc: any, cert) => {
                                const eid = cert.event_id;
                                if (!acc[eid]) acc[eid] = { event: cert.events, participants: [] };
                                acc[eid].participants.push(cert);
                                return acc;
                            }, {})
                    ).map(([eventId, data]: [string, any]) => (
                        <div key={eventId} className="bg-[#0D0D0D] border border-exec-border rounded-none overflow-hidden flex flex-col shadow-xl shadow-black/40">
                            {/* Card Header */}
                            <div className="p-4 bg-[#111] border-b border-exec-border flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{data.event?.title || 'Evento sin título'}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-tight">
                                            <CalendarIcon className="w-3 h-3 text-exec-blue" />
                                            {data.event?.scheduled_date ? new Date(data.event.scheduled_date).toLocaleDateString() : 'Sin fecha'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-exec-blue font-bold uppercase">
                                            <Users className="w-3 h-3" />
                                            {data.participants.length} Certificados
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/events?id=${eventId}&tab=certificates`)}
                                    className="p-2 bg-[#1A1A1A] hover:bg-exec-blue/20 text-exec-blue rounded-none border border-exec-border transition-all whitespace-nowrap text-xs font-bold"
                                    title="Gestionar este evento"
                                >
                                    Gestionar
                                </button>
                            </div>

                            {/* Participants List inside Card */}
                            <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-exec-border">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-[#0A0A0A] border-b border-exec-border text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                                        <tr>
                                            <th className="px-4 py-2">Miembro</th>
                                            <th className="px-4 py-2">Categoría</th>
                                            <th className="px-4 py-2 text-right">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#151515]">
                                        {data.participants.map((cert: any) => (
                                            <tr key={cert.id} className="hover:bg-[#151515] transition-colors group">
                                                <td className="px-4 py-3 text-white font-medium">{cert.full_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-exec-blue/5 text-exec-blue border border-exec-blue/10 rounded-none font-bold uppercase tracking-tighter">
                                                        {cert.category || 'Asistente'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <a 
                                                        href={cert.certificate_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-exec-blue hover:text-white transition-colors font-bold no-underline"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Ver
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {eventCertificates.filter(c => c.certificate_url).length === 0 && (
                        <div className="col-span-full py-16 bg-[#0D0D0D] border border-dashed border-exec-border rounded-none flex flex-col items-center justify-center gap-4 text-gray-500">
                            <Award className="w-12 h-12 text-gray-800" />
                            <p className="text-sm font-medium">No se han encontrado certificados institucionales emitidos.</p>
                            <p className="text-xs text-gray-600">Comienza a emitir certificados desde la gestión de eventos.</p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'training' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(
                        courseCertificates
                            .filter(c => 
                                c.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                c.courses?.title?.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .reduce((acc: any, cert) => {
                                const cid = cert.course_id;
                                if (!acc[cid]) acc[cid] = { course: cert.courses, participants: [] };
                                acc[cid].participants.push(cert);
                                return acc;
                            }, {})
                    ).map(([courseId, data]: [string, any]) => (
                        <div key={courseId} className="bg-[#0D0D0D] border border-exec-border rounded-none overflow-hidden flex flex-col shadow-xl shadow-black/40">
                            {/* Card Header */}
                            <div className="p-4 bg-[#111] border-b border-exec-border flex justify-between items-start gap-4 text-emerald-500/80">
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">{data.course?.title || 'Curso sin título'}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-tight">
                                            <Award className="w-3 h-3 text-emerald-400" />
                                            Certificación Académica
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase">
                                            <CheckCircle className="w-3 h-3" />
                                            {data.participants.length} Miembros
                                        </div>
                                    </div>
                                </div>
                                <Search className="w-4 h-4 text-gray-700 mt-1" />
                            </div>

                            {/* Participants List */}
                            <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-exec-border">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-[#0A0A0A] border-b border-exec-border text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                                        <tr>
                                            <th className="px-4 py-2">Miembro</th>
                                            <th className="px-4 py-2 text-right">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#151515]">
                                        {data.participants.map((cert: any) => (
                                            <tr key={cert.id} className="hover:bg-emerald-500/5 transition-colors group">
                                                <td className="px-4 py-3 text-white font-medium">{cert.profiles?.full_name}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <a 
                                                        href={cert.pdf_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-bold no-underline"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Ver
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {courseCertificates.length === 0 && (
                        <div className="col-span-full py-16 bg-[#0D0D0D] border border-dashed border-exec-border rounded-none flex flex-col items-center justify-center gap-4 text-gray-500">
                            <School className="w-12 h-12 text-gray-800" />
                            <p className="text-sm font-medium">No se han encontrado miembros certificados en capacitaciones.</p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'recognitions' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {Object.entries(
                        recognitions
                            .filter(r => 
                                r.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                r.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .reduce((acc: any, rec) => {
                                const title = rec.metadata?.title || rec.title || 'Reconocimiento';
                                if (!acc[title]) acc[title] = { title, participants: [] };
                                acc[title].participants.push(rec);
                                return acc;
                            }, {})
                    ).map(([title, data]: [string, any]) => (
                        <div key={title} className="bg-[#0D0D0D] border border-exec-border rounded-none overflow-hidden flex flex-col shadow-xl shadow-black/40">
                            {/* Card Header */}
                            <div className="p-4 bg-[#111] border-b border-exec-border flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-exec-blue mb-1">{title}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-tight">
                                            <Star className="w-3 h-3 text-exec-blue" />
                                            Reconocimiento Especial
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-exec-blue font-bold uppercase">
                                            <Users className="w-3 h-3" />
                                            {data.participants.length} Miembros
                                        </div>
                                    </div>
                                </div>
                                <Plus className="w-4 h-4 text-gray-700 mt-1" />
                            </div>

                            {/* Participants List */}
                            <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-exec-border">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-[#0A0A0A] border-b border-exec-border text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                                        <tr>
                                            <th className="px-4 py-2">Miembro</th>
                                            <th className="px-4 py-2 text-right">Diploma</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#151515]">
                                        {data.participants.map((rec: any) => (
                                            <tr key={rec.id} className="hover:bg-exec-blue/5 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className="text-white font-medium">{rec.profiles?.full_name}</div>
                                                    <div className="text-[9px] text-gray-500 uppercase">{rec.profiles?.role}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <a 
                                                        href={rec.pdf_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-exec-blue hover:text-white transition-colors font-bold no-underline"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Ver
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {recognitions.length === 0 && (
                        <div className="col-span-full py-16 bg-[#0D0D0D] border border-dashed border-exec-border rounded-none flex flex-col items-center justify-center gap-4 text-gray-500">
                            <Star className="w-12 h-12 text-gray-800" />
                            <p className="text-sm font-medium">No se han emitido reconocimientos todavía.</p>
                        </div>
                    )}
                </div>
            ) : null}

            {showRecognitionModal && (
                <RecognitionModal 
                    onClose={() => setShowRecognitionModal(false)}
                    onSave={() => loadData()} // Data will be reloaded after all are emitted
                />
            )}
        </div>
    );
}

function RecognitionModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [searchMember, setSearchMember] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        issue_date: new Date().toISOString().split('T')[0]
    });

    // Bulk processing state
    const [processing, setProcessing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [generatedCount, setGeneratedCount] = useState(0);

    useEffect(() => { loadProfiles(); }, []);

    async function loadProfiles() {
        const { data } = await supabase.from('profiles').select('id, full_name, role, avatar_url').order('full_name');
        if (data) setProfiles(data);
    }

    const filteredProfiles = profiles.filter(p => 
        p.full_name?.toLowerCase().includes(searchMember.toLowerCase()) ||
        p.role?.toLowerCase().includes(searchMember.toLowerCase())
    );

    const toggleUser = (id: string) => {
        setSelectedUserIds(prev => 
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    // --- AI DRAFTING WITH HOYR ---
    const [hoyrCommand, setHoyrCommand] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    
    async function handleHoyrCommand() {
        if (!hoyrCommand.trim()) return;

        setIsGeneratingAI(true);
        try {
            // Simulated Advanced Extraction Logic
            // In a real scenario, this goes to an LLM endpoint
            const prompt = hoyrCommand.toLowerCase();
            
            setTimeout(() => {
                let newTitle = '';
                let newDesc = '';

                // Simple 'Intent' extraction for the demo experience
                if (prompt.includes('vol 2') || prompt.includes('volumen 2')) {
                    newTitle = 'Contribución Editorial: Revista ACS Vol. 2';
                    newDesc = 'En mérito a su excepcional labor en la revisión, edición y consolidación de los artículos científicos publicados en el Volumen 2 de la Revista Alternativas en Ciencias Sociales.';
                } else if (prompt.includes('equipo') || prompt.includes('todo')) {
                    newTitle = 'Excelencia en Trabajo Colaborativo';
                    newDesc = 'En reconocimiento a su invaluable espíritu de equipo, sinergia institucional y compromiso con los objetivos colectivos de la Unidad de Investigación.';
                    // Pre-select all visible if the user asks for "everyone"
                    if (prompt.includes('todos') || prompt.includes('todo el equipo')) {
                        setSelectedUserIds(profiles.map(p => p.id));
                    }
                } else if (prompt.includes('evento') || prompt.includes('congreso')) {
                    newTitle = 'Desempeño Destacado en Organización de Eventos';
                    newDesc = 'Por su impecable gestión logística y académica durante la ejecución del reciente certamen institucional, garantizando la excelencia y el impacto académico.';
                } else {
                    newTitle = `Reconocimiento: ${hoyrCommand.split(' ').slice(0, 3).join(' ')}...`;
                    newDesc = `En mérito a su destacada participación y aportes fundamentales en el ámbito de "${hoyrCommand}", fortaleciendo los pilares de la Revista ACS.`;
                }

                setFormData({ ...formData, title: newTitle, description: newDesc });
                setIsGeneratingAI(false);
            }, 1200);
        } catch (error) {
            setIsGeneratingAI(false);
        }
    }

    // --- SEQUENTIAL BULK EMISSION ---
    async function startEmission() {
        if (selectedUserIds.length === 0) return;
        setProcessing(true);
        setCurrentIndex(0);
    }

    const handleCertificateGenerated = async (pdfUrl: string) => {
        const currentUser = profiles.find(p => p.id === selectedUserIds[currentIndex]);
        console.log(`[BULK] Emisión completada para: ${currentUser?.full_name}`);
        
        try {
            // Save to DB (using the official certificates table)
            const { error } = await supabase.from('certificates').insert({
                user_id: currentUser.id,
                type: 'reconocimiento',
                pdf_url: pdfUrl,
                certificate_code: `REC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                metadata: { 
                    title: formData.title, 
                    description: formData.description,
                    issue_date: formData.issue_date
                }
            });

            if (error) console.error("[BULK] Error guardando en DB:", error);
        } catch (err) {
            console.error("[BULK] Excepción en guardado:", err);
        }

        moveToNext();
    };

    const moveToNext = () => {
        const nextIndex = currentIndex + 1;
        setGeneratedCount(prev => prev + 1);

        if (nextIndex < selectedUserIds.length) {
            // Small delay to let the UI breathe and clean up memory before next canvas
            setTimeout(() => {
                setCurrentIndex(nextIndex);
            }, 500);
        } else {
            // Finished
            setTimeout(() => {
                onSave();
                onClose();
            }, 1500);
        }
    };

    if (processing) {
        const currentUser = profiles.find(p => p.id === selectedUserIds[currentIndex]);
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                <div className="text-center space-y-8 max-w-2xl w-full">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-exec-blue/20 blur-3xl rounded-full"></div>
                        <div className="relative bg-[#0A0A0A] p-6 rounded-full border border-exec-blue/50 shadow-[0_0_50px_rgba(0,136,255,0.3)]">
                            <Loader2 className="w-16 h-16 text-exec-blue animate-spin" />
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Procesando Diplomas...</h3>
                        <p className="text-gray-400">Paciencia, estamos firmando y sellando los reconocimientos digitalmente.</p>
                    </div>

                    <div className="bg-[#111] border border-exec-border p-4 rounded-none">
                        <div className="flex justify-between text-xs text-gray-500 mb-2 uppercase font-bold tracking-widest">
                            <span>Progreso General</span>
                            <span>{generatedCount} / {selectedUserIds.length}</span>
                        </div>
                        <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-exec-blue transition-all duration-500"
                                style={{ width: `${(generatedCount / selectedUserIds.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {currentUser && (
                        <div className="flex items-center justify-center gap-4 p-4 bg-exec-blue/5 rounded-none border border-exec-blue/10 animate-pulse">
                            <img 
                                src={currentUser.avatar_url || `https://ui-avatars.com/api/?name=${currentUser.full_name}&background=random`} 
                                className="w-12 h-12 rounded-full border-2 border-exec-blue/30"
                                alt=""
                            />
                            <div className="text-left">
                                <p className="text-xs text-exec-blue font-bold uppercase">Emitiendo para:</p>
                                <p className="text-lg font-bold text-white tracking-wide">{currentUser.full_name}</p>
                            </div>
                        </div>
                    )}

                    {/* HIDDEN GENERATOR - Sequential */}
                    {currentIndex !== -1 && (
                        <RecognitionGenerator 
                            key={selectedUserIds[currentIndex]}
                            userId={currentUser.id}
                            userName={currentUser.full_name}
                            userRole={currentUser.role || 'Miembro'}
                            title={formData.title}
                            description={formData.description}
                            issueDate={formData.issue_date}
                            onGenerated={handleCertificateGenerated}
                            onError={(err) => {
                                console.warn(`[BULK] Fallo en ${currentUser.full_name}:`, err);
                                moveToNext(); // Skip and continue with next even if one fails
                            }}
                            hidePreview={true}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-2xl border border-exec-border flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F]">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-exec-blue" />
                            Gestión de Reconocimientos Institucionales
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Universidad Nacional de Cajamarca - Facultad de CC.SS</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#1A1A1A] rounded-full">
                        <X className="w-5 h-5 text-gray-500 hover:text-white" />
                    </button>
                </div>

                {/* HOYR COMMAND BAR */}
                <div className="px-6 py-4 bg-exec-blue/5 border-b border-exec-blue/10">
                    <div className="relative">
                        <input 
                            type="text"
                            placeholder="Ej: Crea un reconocimiento por el Vol 2 para todo el equipo..."
                            value={hoyrCommand}
                            onChange={(e) => setHoyrCommand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleHoyrCommand()}
                            className="w-full pl-12 pr-32 py-3 bg-[#0D0D0D] border border-exec-blue/30 rounded-none text-sm text-white placeholder:text-gray-600 focus:border-exec-blue outline-none shadow-[0_0_20px_rgba(0,136,255,0.1)]"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <Sparkles className={`w-5 h-5 ${isGeneratingAI ? 'text-exec-blue animate-pulse' : 'text-exec-blue'}`} />
                        </div>
                        <button 
                            onClick={handleHoyrCommand}
                            disabled={isGeneratingAI || !hoyrCommand}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 transition-all"
                        >
                            {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Elaborar con IA
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 divide-x-0 md:divide-x divide-exec-border">
                    {/* Column 1: Selection */}
                    <div className="space-y-4 pr-0 md:pr-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">1. Seleccionar Destinatarios ({selectedUserIds.length})</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input 
                                type="text"
                                placeholder="Buscar miembros..."
                                value={searchMember}
                                onChange={(e) => setSearchMember(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-exec-border rounded-none text-sm text-white focus:border-exec-blue outline-none"
                            />
                        </div>

                        <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
                            {filteredProfiles.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => toggleUser(p.id)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-none transition-all ${
                                        selectedUserIds.includes(p.id) 
                                            ? 'bg-exec-blue/20 border border-exec-blue/50' 
                                            : 'hover:bg-[#151515] border border-transparent'
                                    }`}
                                >
                                    <div className="relative">
                                        <img 
                                            src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&background=random`} 
                                            className="w-8 h-8 rounded-full border border-exec-border"
                                            alt=""
                                        />
                                        {selectedUserIds.includes(p.id) && (
                                            <div className="absolute -top-1 -right-1 bg-exec-blue rounded-full p-0.5">
                                                <Check className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-white">{p.full_name}</div>
                                        <div className="text-[9px] text-gray-500 uppercase">{p.role || 'Miembro'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Content */}
                    <div className="space-y-5 pl-0 md:pl-8">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">2. Detalles del Mérito</label>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Título del Diploma</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Reconocimiento a la Excelencia Académica"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-exec-border rounded-none text-sm text-white focus:border-exec-blue outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Descripción del Mérito</label>
                                <textarea
                                    rows={4}
                                    placeholder="Describe por qué se otorga este reconocimiento..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-exec-border rounded-none text-sm text-white focus:border-exec-blue outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Fecha de Emisión</label>
                                    <input
                                        type="date"
                                        value={formData.issue_date}
                                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-exec-border rounded-none text-xs text-white focus:border-exec-blue outline-none"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button
                                        onClick={startEmission}
                                        disabled={selectedUserIds.length === 0 || !formData.title}
                                        className="w-full py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-xs font-bold shadow-lg shadow-exec-blue/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Emitir ({selectedUserIds.length})
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-none flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <p className="text-[10px] text-amber-200/60 leading-relaxed uppercase tracking-tighter">
                                Al emitir estos diplomas, se generará automáticamente la firma de la Dra. Doris y el Decano de la Facultad. Asegúrese que el mérito esté correctamente redactado.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-[#1F1F1F] flex justify-between items-center bg-[#0D0D0D]">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Procedimiento Institucional SGR-ACS</p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors uppercase font-bold"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


