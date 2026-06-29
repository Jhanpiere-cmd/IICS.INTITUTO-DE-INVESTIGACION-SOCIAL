import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../../lib/supabase';
import { generateEmailContent } from '../../lib/ai';
import { useToast } from '../ui/ToastContext';
import { X, ArrowLeft, Mail, Printer, MoreVertical, Star, Download, FileText, Image as ImageIcon } from 'lucide-react';

interface EmailLog {
    id: string;
    recipient_email: string;
    recipient_name: string;
    from_email?: string;
    from_name?: string;
    subject: string;
    status?: 'sent' | 'failed' | 'pending';
    sent_at?: string;
    received_at?: string;
    type: string;
    message_body?: string;
    body_html?: string;
    error_details?: string;
    attachments?: any[];
    is_read?: boolean;
}

export const MailCenter: React.FC = () => {
    const [view, setView] = useState<'sent' | 'failed' | 'inbox'>('sent');
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const { showToast } = useToast();
    
    // Stich Design Tokens & Styles
    const stichStyles = `
        .stich-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .stich-scrollbar::-webkit-scrollbar-track { background: #0A0A0A; }
        .stich-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 0px; }
        .stich-scrollbar::-webkit-scrollbar-thumb:hover { background: #3B82F6; }
        .stich-card { background: #0A0A0A; border: 1px solid #262626; border-radius: 2px; }
        .stich-input { background: #171717; border: 1px solid #262626; border-radius: 2px; color: #E2E8F0; }
        .stich-btn-primary { background: #3B82F6; color: white; border-radius: 2px; transition: all 0.2s; }
        .stich-btn-secondary { background: #000000; border: 1px solid #262626; color: #94A3B8; border-radius: 2px; }
        .stich-email-container { max-height: 600px; overflow-y: auto; box-shadow: inset 0 0 20px rgba(0,0,0,0.1); }
        .stich-email-container::-webkit-scrollbar { width: 4px; }
        .stich-email-container::-webkit-scrollbar-thumb { background: #3B82F6; }
        
        /* Gmail Fidelity Styles - Adapted for Stich Dark */
        .gmail-modal { background: #0A0A0A; color: #E2E8F0; font-family: 'Inter', 'Roboto', sans-serif; }
        .gmail-paper { background: #111111; border: 1px solid #262626; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border-radius: 4px; }
        .gmail-subject { font-size: 22px; line-height: 28px; color: #202124; font-weight: 400; }
        .gmail-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .gmail-sender-name { font-weight: 700; color: #FFFFFF; font-size: 14px; }
        .gmail-sender-email { color: #94A3B8; font-size: 11px; }
        .gmail-date { color: #64748B; font-size: 11px; }
        .gmail-attachment-card { width: 180px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; background: #f5f5f5; }
        .gmail-attachment-preview { height: 100px; background: #eeeeee; position: relative; overflow: hidden; }
        .gmail-attachment-footer { padding: 8px; display: flex; align-items: center; gap: 8px; background: white; border-top: 1px solid #e0e0e0; }
        .gmail-btn-back { color: #5f6368; padding: 8px; border-radius: 50%; transition: background 0.2s; }
        .gmail-btn-back:hover { background: rgba(60,64,67,0.08); }
    `;

    useEffect(() => {
        const getAvatar = async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user?.user_metadata?.avatar_url) {
                setUserAvatar(data.user.user_metadata.avatar_url);
            }
        };
        getAvatar();
    }, []);

    // Filtros y Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'certificate' | 'custom'>('all');

    // Métricas Reales
    const [metrics, setMetrics] = useState({
        sentToday: 0,
        failedToday: 0,
        totalWeek: 0
    });
    
    // Redactor State
    const [isRedactOpen, setIsRedactOpen] = useState(false);
    const [isGeneratingIA, setIsGeneratingIA] = useState(false);
    const [formData, setFormData] = useState({
        to: '',
        subject: '',
        message: '',
        iaPrompt: ''
    });
    const [isSending, setIsSending] = useState(false);
    const [contactSuggestions, setContactSuggestions] = useState<{email: string, name: string}[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [attachments, setAttachments] = useState<{name: string, content: string, type: string}[]>([]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const content = selectedEmail?.message_body || '';
        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Correo - Revista ACS</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
                        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
                        .subject { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                        .meta { font-size: 13px; color: #666; }
                        .body { line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="subject">${selectedEmail?.subject}</div>
                        <div class="meta">De: ${isInbox ? selectedEmail?.from_name : 'Revista ACS'} &lt;${isInbox ? selectedEmail?.from_email : 'equipodecomunicacionesacs@gmail.com'}&gt;</div>
                        <div class="meta">Para: ${isInbox ? 'Revista ACS <equipodecomunicacionesacs@gmail.com>' : (selectedEmail?.recipient_name || selectedEmail?.recipient_email)}</div>
                        <div class="meta">Fecha: ${new Date(selectedEmail?.sent_at || selectedEmail?.received_at || '').toLocaleString()}</div>
                    </div>
                    <div class="body">${content}</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const isInbox = view === 'inbox';

    const handleReply = () => {
        if (!selectedEmail) return;
        setFormData({
            to: isInbox ? (selectedEmail.from_email || '') : selectedEmail.recipient_email,
            subject: `Re: ${selectedEmail.subject}`,
            message: '\n\n' + '-'.repeat(30) + '\n' + (selectedEmail.message_body || selectedEmail.body_html || '').replace(/<[^>]*>?/gm, ''),
            iaPrompt: ''
        });
        setIsRedactOpen(true);
    };

    const handleForward = () => {
        if (!selectedEmail) return;
        setFormData({
            to: '',
            subject: `Fwd: ${selectedEmail.subject}`,
            message: '\n\n' + '-'.repeat(30) + '\n' + (selectedEmail.message_body || selectedEmail.body_html || '').replace(/<[^>]*>?/gm, ''),
            iaPrompt: ''
        });
        setIsRedactOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedEmail) return;
        if (!confirm('¿ESTÁ_SEGURO_DE_ELIMINAR_ESTA_TRAZA?_ESTA_ACCION_ES_IRREVERSIBLE.')) return;

        try {
            const { error } = await supabase
                .from(isInbox ? 'email_inbox' : 'email_logs')
                .delete()
                .eq('id', selectedEmail.id);

            if (error) throw error;

            showToast({ type: 'success', title: 'Registro Eliminado', message: 'La traza ha sido removida del sistema' });
            setSelectedEmail(null);
            loadEmails({ current: true });
        } catch (error: any) {
            showToast({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setAttachments(prev => [...prev, {
                    name: file.name,
                    content: base64.split(',')[1], // Solo el base64 sin prefijo
                    type: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const loadEmails = async (isActive: { current: boolean }) => {
        setLoading(true);
        try {
            let query = supabase
                .from(view === 'inbox' ? 'email_inbox' : 'email_logs')
                .select('*')
                .order(view === 'inbox' ? 'received_at' : 'sent_at', { ascending: false });

            if (view !== 'inbox') {
                query = query.eq('status', view === 'sent' ? 'sent' : 'failed');
            }

            if (typeFilter !== 'all' && view !== 'inbox') {
                query = query.eq('type', typeFilter);
            }

            const { data, error } = await query;
            if (!isActive.current) return;
            
            if (error) throw error;
            setEmails(data || []);
            loadMetrics(); // Cargamos métricas al mismo tiempo
            
            // Extraer sugerencias únicas del historial completo para autocompletado (solo si es necesario)
            if (contactSuggestions.length === 0 && isActive.current) {
                const { data: allLogs } = await supabase.from('email_logs').select('recipient_email, recipient_name').order('sent_at', { ascending: false }).limit(200);
                if (allLogs && isActive.current) {
                    const uniqueContacts = Array.from(new Set(allLogs.filter(l => l.recipient_email).map((l: any) => l.recipient_email)))
                        .map(email => {
                            const contact = allLogs.find((l: any) => l.recipient_email === email);
                            return { email: email as string, name: (contact?.recipient_name || '') as string };
                        });
                    setContactSuggestions(uniqueContacts);
                }
            }
        } catch (error: any) {
            if (isActive.current) console.error('Error loading emails:', error);
        } finally {
            if (isActive.current) setLoading(false);
        }
    };

    const loadMetrics = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: sentCount } = await supabase
                .from('email_logs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'sent')
                .gte('sent_at', today.toISOString());

            const { count: failedCount } = await supabase
                .from('email_logs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'failed')
                .gte('sent_at', today.toISOString());

            setMetrics({
                sentToday: sentCount || 0,
                failedToday: failedCount || 0,
                totalWeek: (sentCount || 0) + (failedCount || 0)
            });
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    };

    // Limpiar selección si el correo ya no está en la lista filtrada (evitar craseos)
    useEffect(() => {
        if (selectedEmail && !emails.find(e => e.id === selectedEmail.id)) {
            setSelectedEmail(null);
        }
    }, [emails, selectedEmail]);

    const handleSelectEmail = async (email: EmailLog) => {
        if (!email?.id) return;
        setSelectedEmail(email);
        if (view === 'inbox' && !email.is_read) {
            try {
                const { error } = await supabase
                    .from('email_inbox')
                    .update({ is_read: true })
                    .eq('id', email.id);
                
                if (!error) {
                    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
                }
            } catch (err) {
                console.error("Error marking as read:", err);
            }
        }
    };

    useEffect(() => {
        const isActive = { current: true };
        loadEmails(isActive);
        return () => { isActive.current = false; };
    }, [view, typeFilter]);

    const handleIACompose = async () => {
        if (!formData.iaPrompt) return;
        setIsGeneratingIA(true);
        try {
            const result = await generateEmailContent(formData.iaPrompt);
            setFormData(prev => ({
                ...prev,
                subject: result.subject,
                message: result.message
            }));
            showToast({ type: 'success', title: 'Gemini AI', message: 'Borrador generado con éxito' });
        } catch (error) {
            showToast({ type: 'error', title: 'Error IA', message: 'No se pudo generar el contenido' });
        } finally {
            setIsGeneratingIA(false);
        }
    };

    const handleSendDirect = async () => {
        if (!formData.to || !formData.subject || !formData.message) {
            showToast({ type: 'error', title: 'Campos incompletos', message: 'Completa todos los campos del formulario' });
            return;
        }

        setIsSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            // Llamar a la nueva Edge Function para envío real
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-direct-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    to: formData.to,
                    subject: formData.subject,
                    html: formData.message.replace(/\n/g, '<br>'), // Convertir saltos de línea a HTML básico
                    attachments: attachments
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            showToast({ type: 'success', title: 'Correo Enviado', message: 'El mensaje se ha enviado correctamente' });
            setIsRedactOpen(false);
            setFormData({ to: '', subject: '', message: '', iaPrompt: '' });
            setAttachments([]); // Limpiar adjuntos
            loadEmails({ current: true });
        } catch (error: any) {
            showToast({ type: 'error', title: 'Error de Envío', message: error.message || 'No se pudo procesar el correo' });
        } finally {
            setIsSending(false);
        }
    };

    const filteredEmails = emails.filter(e => {
        if (!e) return false;
        const searchPool = isInbox 
            ? `${e.from_name || ''} ${e.from_email || ''} ${e.subject || ''}`.toLowerCase()
            : `${e.recipient_name || ''} ${e.recipient_email || ''} ${e.subject || ''}`.toLowerCase();
        return searchPool.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full bg-[#000000] text-slate-200 rounded-sm border border-[#262626] overflow-hidden shadow-2xl font-sans antialiased">
            <style>{stichStyles}</style>
            
            {/* DESKTOP BOX (Isolation) */}
            <div className="hidden md:flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-[#262626] bg-[#0a0a0a] flex flex-col">
                <div className="p-6">
                    <button 
                        onClick={() => setIsRedactOpen(true)}
                        className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white py-3 px-4 rounded-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 uppercase tracking-widest text-[10px]"
                    >
                        <span className="material-symbols-outlined notranslate text-sm" translate="no">edit</span>
                        Redactar
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto stich-scrollbar">
                    <div className="px-6 pb-4 space-y-6">
                        {/* Buscador */}
                        <div className="relative">
                            <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm" translate="no">search</span>
                            <input 
                                type="text"
                                placeholder="BUSCAR_REGISTRO"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#171717] border border-[#262626] rounded-sm pl-9 pr-3 py-2 text-[9px] focus:border-[#3B82F6] outline-none transition-all uppercase tracking-tighter placeholder:text-gray-700 font-mono"
                            />
                        </div>

                        {/* Bandejas */}
                        <div className="space-y-1">
                            <p className="text-[9px] text-gray-600 font-bold uppercase ml-1 mb-2 tracking-[0.2em]">Sistemas</p>
                            {[
                                { id: 'inbox', label: 'Recibidos', icon: 'inbox' },
                                { id: 'sent', label: 'Enviados', icon: 'send' },
                                { id: 'failed', label: 'No enviados', icon: 'error' },
                            ].map((folder) => (
                                <button
                                    key={folder.id}
                                    onClick={() => {
                                        setView(folder.id as any);
                                        setSelectedEmail(null); // Limpiar selección al cambiar de bandeja
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-[10px] transition-all uppercase tracking-widest ${
                                        view === folder.id 
                                        ? 'bg-[#1a1a1a] text-white border border-[#262626]' 
                                        : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`material-symbols-outlined text-sm ${view === folder.id ? 'text-[#3B82F6]' : ''}`}>{folder.icon}</span>
                                        {folder.label}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Filtros */}
                        <div className="space-y-1">
                            <p className="text-[9px] text-gray-600 font-bold uppercase ml-1 mb-2 tracking-[0.2em]">Categorías</p>
                            {[
                                { id: 'all', label: 'Todos', icon: 'grid_view' },
                                { id: 'certificate', label: 'Certificados', icon: 'school' },
                                { id: 'custom', label: 'Comunicados', icon: 'campaign' }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setTypeFilter(cat.id as any)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-[10px] transition-all uppercase tracking-widest ${
                                        typeFilter === cat.id ? 'text-[#3B82F6] bg-[#0f172a]/50' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined notranslate text-sm" translate="no">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Métricas Reales */}
                <div className="p-6 border-t border-[#262626] bg-[#050505]">
                    <div className="flex items-center gap-2 text-[#3B82F6] mb-4 px-1">
                        <span className="material-symbols-outlined notranslate text-xs" translate="no">analytics</span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">ESTADO_TIEMPO_REAL</span>
                    </div>
                    <div className="space-y-3 font-mono">
                        <div className="flex justify-between items-center px-1 text-[9px]">
                            <span className="text-gray-600">ENVIADOS</span>
                            <span className="font-bold text-white tracking-widest">{metrics.sentToday}</span>
                        </div>
                        <div className="flex justify-between items-center px-1 text-[9px]">
                            <span className="text-gray-600">MANIFIESTO_ERR</span>
                            <span className="font-bold text-red-500 tracking-widest">{metrics.failedToday}</span>
                        </div>
                        <div className="w-full h-0.5 bg-[#171717] rounded-full overflow-hidden mt-1 px-[1px]">
                            <div 
                                className="h-full bg-[#3B82F6] transition-all duration-1000"
                                style={{ width: `${metrics.sentToday > 0 ? (metrics.sentToday / (metrics.sentToday + metrics.failedToday)) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email List Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">
                <div className="h-16 border-b border-[#262626] flex items-center justify-between px-6 bg-[#0a0a0a] sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                            {view === 'inbox' ? 'BANDEJA_DE_ENTRADA' : (view === 'sent' ? 'REGISTROS_TRANSMISION' : 'MANIFIESTO_ERRORES')}
                            {typeFilter !== 'all' && view !== 'inbox' && <span className="ml-2 text-[9px] text-[#3B82F6] font-normal tracking-tight">({typeFilter})</span>}
                        </h2>
                        <div className="flex items-center gap-1">
                            <button onClick={() => loadEmails({ current: true })} title="REFRESCAR_VISTA" className="p-2 hover:bg-white/5 rounded-sm transition-colors text-gray-600 hover:text-white">
                                <span className="material-symbols-outlined notranslate text-[18px]" translate="no">refresh</span>
                            </button>
                            {view === 'inbox' && (
                                <button 
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const response = await fetch(`${supabaseUrl}/functions/v1/check-incoming-emails-v2`, {
                                                method: 'POST',
                                                headers: {
                                                    'Authorization': `Bearer ${session?.access_token}`
                                                }
                                            });
                                            const result = await response.json();
                                            if (result.success) {
                                                showToast({ type: 'success', title: 'Sincronización IMAP', message: result.message });
                                                const isActive = { current: true };
                                                loadEmails(isActive);
                                            } else {
                                                throw new Error(result.error);
                                            }
                                        } catch (error: any) {
                                            showToast({ type: 'error', title: 'Error IMAP', message: error.message || 'No se pudo sincronizar' });
                                        } finally {
                                            setLoading(false);
                                        }
                                    }} 
                                    title="SINC_IMAP"
                                    className="p-2 hover:bg-blue-500/10 rounded-sm transition-colors text-[#3B82F6] hover:text-white flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined notranslate text-[18px]" translate="no">sync</span>
                                    <span className="text-[8px] font-bold uppercase tracking-widest hidden sm:inline">SINCRONIZAR</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto stich-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-700">
                            <div className="animate-spin rounded-full h-5 w-5 border border-[#3B82F6]/30 border-t-[#3B82F6]"></div>
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">SINCRONIZANDO_CONSOLA...</span>
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-800 gap-4 opacity-30">
                            <span className="material-symbols-outlined notranslate text-5xl" translate="no">mail_outline</span>
                            <p className="text-[10px] font-mono tracking-tighter">TERMINAL_VACIA</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#262626]">
                            {filteredEmails.map((email) => (
                                <div 
                                    key={email.id}
                                    onClick={() => {
                                        handleSelectEmail(email);
                                    }}
                                    className={`group flex items-center gap-4 px-6 py-4 cursor-pointer transition-all border-l-2 ${
                                        selectedEmail?.id === email.id ? 'border-[#3B82F6] bg-[#0A0A0A]' : 'border-transparent hover:bg-[#050505]'
                                    }`}
                                >
                                    <div className="flex-shrink-0">
                                        <div className="w-9 h-9 bg-[#111111] border border-[#262626] rounded-sm flex items-center justify-center text-white font-bold text-[10px] uppercase group-hover:border-[#3B82F6] transition-all">
                                            {isInbox 
                                                ? (email?.from_name?.charAt(0) || email?.from_email?.charAt(0) || '?') 
                                                : (email?.recipient_name?.charAt(0) || email?.recipient_email?.charAt(0) || '?')}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-semibold text-white truncate tracking-tight">
                                                {isInbox ? (email?.from_name || email?.from_email || 'S/N') : (email?.recipient_name || email?.recipient_email || 'S/N')}
                                            </p>
                                            <p className="text-[9px] font-mono text-gray-600 uppercase">
                                                {new Date(email?.sent_at || email?.received_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-gray-500 truncate font-sans tracking-wide">{email.subject}</p>
                                            {!isInbox && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter border ${
                                                        email.status === 'sent' 
                                                        ? 'border-green-900/50 text-green-500 bg-green-950/10' 
                                                        : 'border-red-900/50 text-red-500 bg-red-950/10'
                                                    }`}>
                                                        {email.status === 'sent' ? 'Entregado' : 'Fallido'}
                                                    </span>
                                                </div>
                                            )}
                                            {isInbox && email.is_read === false && (
                                                <div className="w-2 h-2 bg-[#3B82F6] rounded-full"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Panel (Vista Previa Real) - Expanded Layout (Stich Dark) */}
            <div className="flex-1 border-l border-[#262626] bg-[#0A0A0A] hidden lg:flex flex-col overflow-hidden">
                {selectedEmail ? (
                    <div className="flex-1 flex flex-col gmail-modal animate-in slide-in-from-right duration-300 h-full overflow-hidden">
                        {/* Panel Internal Header - Stitch Themed Actions */}
                        <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#050505] sticky top-0 z-10">
                            <div className="flex gap-4">
                                <button onClick={() => setSelectedEmail(null)} className="gmail-btn-back flex items-center justify-center !text-gray-400 hover:!bg-[#171717]">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleDelete} className="flex items-center justify-center hover:bg-red-500/10 p-1.5 rounded-sm transition-colors group">
                                        <span className="material-symbols-outlined notranslate text-gray-500 group-hover:text-red-500 text-xl transition-colors" translate="no">delete</span>
                                    </button>
                                    <span className="text-[10px] text-gray-700 font-mono tracking-tighter">ID: {selectedEmail.id.substring(0,8)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-2">
                                <Printer 
                                    className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" 
                                    onClick={handlePrint}
                                />
                                <div className="h-4 w-[1px] bg-[#262626]"></div>
                                <MoreVertical className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto stich-scrollbar p-0 bg-[#0A0A0A]">
                            {/* Subject Area - Full Width Padding */}
                            <div className="p-8 pb-4">
                                <h1 className="gmail-subject !text-white text-2xl !leading-tight font-bold tracking-tight">{selectedEmail.subject}</h1>
                            </div>

                            {/* Sender/Recipient Info - Full Width Padding */}
                            <div className="px-8 flex justify-between items-start mb-8">
                                <div className="flex gap-3 min-w-0">
                                    <img 
                                        src={isInbox ? "https://ui-avatars.com/api/?name=" + (selectedEmail.from_name || selectedEmail.from_email) : "/certificates/logo-revista/logo-revista-ACS.png"} 
                                        className={`gmail-avatar !w-10 !h-10 border border-[#262626] shrink-0 ${!isInbox ? 'grayscale invert brightness-200' : ''}`} 
                                        alt="Avatar" 
                                    />
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2">
                                            <span className="gmail-sender-name !text-white">{isInbox ? (selectedEmail.from_name || selectedEmail.from_email) : "Revista ACS"}</span>
                                            <span className="gmail-sender-email !text-[#3B82F6] font-mono">&lt;{isInbox ? selectedEmail.from_email : "equipodecomunicacionesacs@gmail.com"}&gt;</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-gray-500 truncate">
                                                para {isInbox ? "Revista ACS <equipodecomunicacionesacs@gmail.com>" : (selectedEmail.recipient_name || selectedEmail.recipient_email)}
                                            </span>
                                            <span className="material-symbols-outlined notranslate text-gray-600 text-[14px]" translate="no">arrow_drop_down</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="gmail-date !text-gray-500 whitespace-nowrap">
                                        {new Date(selectedEmail.sent_at || selectedEmail.received_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div className="flex gap-3">
                                        <Star className="w-4 h-4 text-gray-600 hover:text-yellow-500 cursor-pointer" />
                                        <button onClick={handleReply}>
                                            <span className="material-symbols-outlined notranslate text-gray-600 hover:text-white cursor-pointer text-lg" translate="no">reply</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Email Body - Expanded to Edges (Stich Version) */}
                            <div className="px-4 mb-8">
                                <div className="gmail-paper p-8 min-h-[400px]">
                                    {(selectedEmail && (selectedEmail.message_body || selectedEmail.body_html)) ? (
                                        <div 
                                            className="prose prose-invert prose-blue max-w-none text-[#E2E8F0] text-[15px] leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: (selectedEmail.message_body || selectedEmail.body_html) as string }} 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#262626] rounded-sm bg-[#050505]">
                                            {selectedEmail.type === 'certificate' ? (
                                                <div className="text-center space-y-4">
                                                    <div className="w-16 h-16 bg-[#111111] border border-[#3B82F6]/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                                        <span className="material-symbols-outlined notranslate text-3xl text-[#3B82F6]" translate="no">workspace_premium</span>
                                                    </div>
                                                    <div className="px-6">
                                                        <p className="text-[10px] text-[#3B82F6] font-bold uppercase tracking-[0.3em] mb-2">AUDITORÍA_SISTEMA</p>
                                                        <h4 className="text-white text-sm font-bold leading-tight">CERTIFICADO_VINCULADO_ACTIVO</h4>
                                                        <p className="text-[10px] text-gray-500 mt-4 leading-relaxed font-mono">
                                                            CONTENIDO_SIN_BUFFER_HISTORICO<br/>
                                                            RECURSO_DIGITAL_DISPONIBLE_EN_STORAGE
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-700 italic text-center font-mono">
                                                    <Mail className="w-10 h-10 mx-auto mb-4 opacity-10" />
                                                    <p className="text-[10px] uppercase tracking-[0.2em]">CONTENIDO_VACIO_REGISTRO</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments Section - Improved Visibility */}
                            {((selectedEmail as any)?.attachments?.length > 0) && (
                                <div className="px-8 py-8 border-t border-[#262626] bg-[#050505]">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full"></span>
                                        ARCHIVOS_ADJUNTOS_ENVIADOS ({(selectedEmail as any).attachments.length})
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        {(selectedEmail as any).attachments.map((file: any, idx: number) => (
                                            <a 
                                                key={idx} 
                                                href={file.url ? file.url : `data:${file.type};base64,${file.content}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="gmail-attachment-card group !w-[160px] !bg-black !border-[#262626] hover:!border-[#3B82F6] transition-all cursor-pointer no-underline"
                                            >
                                                <div className="gmail-attachment-preview !h-[90px] !bg-[#050505] flex items-center justify-center relative overflow-hidden">
                                                    {file.type?.includes('image') ? (
                                                        <img src={file.url ? file.url : `data:${file.type};base64,${file.content}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={file.name} />
                                                    ) : (
                                                        <FileText className="w-8 h-8 text-[#3B82F6]/50" />
                                                    )}
                                                    <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                </div>
                                                <div className="gmail-attachment-footer !bg-[#0A0A0A] !border-[#262626] py-3 px-4 flex items-center gap-2">
                                                    <Download className="w-3 h-3 text-[#3B82F6]" />
                                                    <span className="text-[10px] text-gray-300 font-medium truncate tracking-tight">{file.name}</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                                                     {/* Quick Action Buttons - Functional */}
                            <div className="p-8 pt-0 flex gap-4">
                                <button 
                                    onClick={handleReply}
                                    className="px-8 py-3 bg-[#111111] border border-[#262626] rounded-sm text-[11px] text-[#3B82F6] font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-[#3B82F6] hover:text-white transition-all shadow-xl shadow-blue-900/10 group"
                                >
                                    <span className="material-symbols-outlined notranslate text-lg group-hover:rotate-[-45deg] transition-transform" translate="no">reply</span>
                                    RESPONDER_CARGA
                                </button>
                                <button 
                                    onClick={handleForward}
                                    className="px-8 py-3 bg-transparent border border-[#262626] rounded-sm text-[11px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-3 hover:border-gray-400 hover:text-white transition-all group"
                                >
                                    <span className="material-symbols-outlined notranslate text-lg group-hover:translate-x-1 transition-transform" translate="no">forward</span>
                                    REENVIAR_TRAZA
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-6 bg-[#000000]">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#3B82F6] blur-3xl opacity-5 rounded-full"></div>
                            <div className="w-24 h-24 rounded-sm border border-[#262626] bg-[#0A0A0A] flex items-center justify-center relative z-10">
                                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="ACS" className="w-14 h-14 grayscale opacity-10" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[#3B82F6] text-[10px] font-bold uppercase tracking-[0.5em] mb-2">AUDITOR_CARGA_ACTIVO</h3>
                            <p className="text-[9px] text-gray-700 font-mono leading-relaxed max-w-[240px] mx-auto uppercase">
                                ESPERANDO_IDENTIFICACION_DE_TRAZA_PARA_DERIVACION_VISUAL
                            </p>
                        </div>
                    </div>
                )}
            </div>
            </div>
            {/* END DESKTOP BOX */}

            {/* MOBILE BOX (Dedicated Interface) */}
            <div className="md:hidden flex flex-1 flex-col overflow-hidden bg-black relative">
                {/* Mobile Header */}
                <div className="p-4 border-b border-[#262626] bg-[#050505] flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" className="w-6 h-6 grayscale invert brightness-200" alt="ACS" />
                        <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Mail_Center_V15</h1>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => loadEmails({ current: true })} className="p-2 text-gray-500 hover:text-white">
                            <span className="material-symbols-outlined notranslate text-[18px]" translate="no">refresh</span>
                        </button>
                        <button onClick={() => setIsRedactOpen(true)} className="bg-[#3B82F6] p-2 rounded-sm text-white shadow-lg">
                            <span className="material-symbols-outlined notranslate text-[18px]" translate="no">edit</span>
                        </button>
                    </div>
                </div>

                {/* Mobile View Switcher (Tabs) */}
                <div className="flex border-b border-[#262626] bg-[#0a0a0a]">
                    {[
                        { id: 'inbox', label: 'Inbox', icon: 'inbox' },
                        { id: 'sent', label: 'Enviados', icon: 'send' },
                        { id: 'failed', label: 'Fallos', icon: 'error' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setView(tab.id as any);
                                setSelectedEmail(null);
                            }}
                            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${
                                view === tab.id ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]' : 'text-gray-600'
                            }`}
                        >
                            <span className="material-symbols-outlined notranslate text-sm" translate="no">{tab.icon}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Mobile Search Input */}
                <div className="p-3 bg-[#050505] border-b border-[#262626]">
                    <div className="relative">
                        <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm" translate="no">search</span>
                        <input 
                            type="text"
                            placeholder="BUSCAR_TRANSACCION..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#111] border border-[#262626] rounded-sm pl-9 pr-3 py-2 text-[9px] outline-none text-white uppercase font-mono"
                        />
                    </div>
                </div>

                {/* Mobile Email List */}
                <div className="flex-1 overflow-y-auto stich-scrollbar bg-black">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center p-10 opacity-30">
                            <div className="animate-spin rounded-full h-4 w-4 border border-[#3B82F6] border-t-transparent mb-4"></div>
                            <p className="text-[8px] font-bold tracking-[0.2em] uppercase">Sincronizando...</p>
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-10 opacity-20">
                            <span className="material-symbols-outlined notranslate text-4xl mb-2" translate="no">move_to_inbox</span>
                            <p className="text-[8px] font-bold tracking-[0.2em] uppercase">Sin registros coincidentes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#171717]">
                            {filteredEmails.map((email) => (
                                <div 
                                    key={email.id}
                                    onClick={() => handleSelectEmail(email)}
                                    className="p-4 active:bg-[#111] transition-colors flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#111] border border-[#262626] flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-[#3B82F6] uppercase">
                                             {isInbox 
                                                ? (email?.from_name?.charAt(0) || email?.from_email?.charAt(0) || '?') 
                                                : (email?.recipient_name?.charAt(0) || email?.recipient_email?.charAt(0) || '?')}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <p className="text-[11px] font-bold text-white truncate">
                                                {isInbox ? (email?.from_name || email?.from_email) : (email?.recipient_name || email?.recipient_email)}
                                            </p>
                                            <span className="text-[8px] font-mono text-gray-600 uppercase">
                                                {new Date(email?.sent_at || email?.received_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium truncate mb-1">{email.subject}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-[1px] uppercase tracking-tighter border ${
                                                email.status === 'sent' 
                                                ? 'border-green-900/50 text-green-500 bg-green-950/5' 
                                                : 'border-red-900/50 text-red-500 bg-red-950/5'
                                            }`}>
                                                {email.status === 'sent' ? 'OK' : 'FAIL'}
                                            </span>
                                            {isInbox && !email.is_read && <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full"></div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile Email Detail Overlay (Stacked View) */}
                {selectedEmail && (
                    <div className="absolute inset-0 z-30 bg-[#0A0A0A] flex flex-col animate-in slide-in-from-right duration-200">
                        {/* Detail Header Mobile */}
                        <div className="p-4 border-b border-[#262626] bg-[#050505] flex items-center justify-between">
                            <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-2 text-gray-400">
                                <ArrowLeft className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Regresar</span>
                            </button>
                            <div className="flex items-center gap-4">
                                <button onClick={handleDelete} className="text-gray-600 active:text-red-500">
                                    <span className="material-symbols-outlined notranslate text-xl" translate="no">delete</span>
                                </button>
                                <button onClick={handleReply} className="text-[#3B82F6]">
                                    <span className="material-symbols-outlined notranslate text-xl" translate="no">reply</span>
                                </button>
                            </div>
                        </div>

                        {/* Detail Content Mobile */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="mb-6">
                                <h1 className="text-xl font-bold text-white mb-4 leading-tight">{selectedEmail.subject}</h1>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center shrink-0 border border-[#262626]">
                                        <span className="text-[10px] font-bold text-[#3B82F6]">
                                            {isInbox ? selectedEmail.from_name?.charAt(0) : 'A'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{isInbox ? (selectedEmail.from_name || selectedEmail.from_email) : 'Revista ACS'}</p>
                                        <p className="text-[10px] text-gray-500 truncate">para {isInbox ? 'mí' : (selectedEmail.recipient_name || selectedEmail.recipient_email)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#111] rounded-sm border border-[#262626] p-4 mb-6">
                                {(selectedEmail.message_body || selectedEmail.body_html) ? (
                                    <div 
                                        className="prose prose-invert prose-xs max-w-none text-slate-300 text-[13px] leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: (selectedEmail.message_body || selectedEmail.body_html) as string }} 
                                    />
                                ) : (
                                    <div className="py-10 text-center text-gray-700 italic text-[10px] uppercase tracking-widest">
                                        Contenido_No_Disponible
                                    </div>
                                )}
                            </div>

                            {/* Mobile Attachments */}
                            {((selectedEmail as any)?.attachments?.length > 0) && (
                                <div className="space-y-3 mb-6">
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1 h-1 bg-[#3B82F6] rounded-full"></span>
                                        ADJUNTOS ({(selectedEmail as any).attachments.length})
                                    </p>
                                    <div className="space-y-2">
                                        {(selectedEmail as any).attachments.map((file: any, idx: number) => (
                                            <a 
                                                key={idx} 
                                                href={file.url ? file.url : `data:${file.type};base64,${file.content}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block bg-black border border-[#262626] p-3 rounded-sm flex items-center justify-between no-underline"
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    <Download className="w-4 h-4 text-[#3B82F6] shrink-0" />
                                                    <span className="text-[10px] text-gray-300 truncate">{file.name}</span>
                                                </div>
                                                <span className="material-symbols-outlined notranslate text-gray-700 text-sm" translate="no">open_in_new</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extra Mobile Actions */}
                            <div className="grid grid-cols-2 gap-3 mb-10">
                                <button onClick={handleReply} className="bg-[#111] border border-[#262626] py-3 rounded-sm text-[10px] font-bold text-white uppercase tracking-widest">Responder</button>
                                <button onClick={handleForward} className="bg-transparent border border-[#262626] py-3 rounded-sm text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reenviar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* END MOBILE BOX */}

            {/* Redactar Modal - Stich Edition */}
            {isRedactOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/95 md:bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] border-0 md:border md:border-[#262626] w-full md:max-w-4xl md:rounded-sm shadow-2xl overflow-hidden flex flex-col h-full md:h-[90vh]">
                        
                        {/* DESKTOP REDACT BOX */}
                        <div className="hidden md:flex flex-col h-full overflow-hidden">
                            <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#050505]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border border-[#262626] bg-black p-1 flex items-center justify-center overflow-hidden">
                                        <img src={userAvatar || "/certificates/logo-revista/logo-revista-ACS.png"} alt="Brand" className="w-full h-full object-cover rounded-full" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold flex items-center gap-3 text-white uppercase tracking-widest">
                                            <span className="material-symbols-outlined notranslate text-[#3B82F6] text-sm" translate="no">terminal</span>
                                            REDACTOR_CORREO_V15
                                        </h2>
                                        <p className="text-[9px] text-gray-600 font-mono tracking-widest mt-1 uppercase">Protocolo_Ejecutivo_Stitch</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsRedactOpen(false)} className="p-2 hover:bg-white/5 rounded-sm transition-colors text-gray-600 hover:text-white">
                                    <span className="material-symbols-outlined notranslate" translate="no">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-row">
                                {/* Copilot Sidebar Desktop */}
                                <div className="w-80 bg-black border-r border-[#262626] p-6 space-y-6">
                                    <div className="flex items-center gap-2 text-[#3B82F6]">
                                        <span className="material-symbols-outlined notranslate text-sm" translate="no">auto_awesome</span>
                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">MÓDULO_COMPOSICIÓN_IA</span>
                                    </div>
                                    <div className="space-y-4">
                                        <textarea 
                                            placeholder="INSTRUCCIÓN_ENTRADA..."
                                            className="w-full bg-[#171717] border border-[#262626] rounded-sm px-4 py-3 text-xs focus:border-[#3B82F6] outline-none transition-all h-48 resize-none font-mono text-[#3B82F6] placeholder:text-gray-800"
                                            value={formData.iaPrompt}
                                            onChange={(e) => setFormData({...formData, iaPrompt: e.target.value})}
                                        />
                                        <button 
                                            onClick={handleIACompose}
                                            disabled={isGeneratingIA || !formData.iaPrompt}
                                            className="w-full bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-20 text-white p-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/10"
                                        >
                                            {isGeneratingIA ? (
                                                <span className="animate-spin material-symbols-outlined text-sm">cycle</span>
                                            ) : (
                                                <span className="material-symbols-outlined notranslate text-sm" translate="no">bolt</span>
                                            )}
                                            {isGeneratingIA ? 'PROCESANDO' : 'EJECUTAR_IA'}
                                        </button>
                                    </div>

                                    <div className="pt-6 border-t border-[#262626] space-y-2">
                                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em]">CACHÉ_VARIABLES</p>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center bg-[#171717] p-2 rounded-sm border border-[#262626]">
                                                <span className="text-[8px] font-mono text-[#3B82F6] tracking-tighter">{"{nombre}"}</span>
                                                <span className="text-[7px] text-gray-600 uppercase">Participante</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-[#171717] p-2 rounded-sm border border-[#262626]">
                                                <span className="text-[8px] font-mono text-[#3B82F6] tracking-tighter">{"{evento}"}</span>
                                                <span className="text-[7px] text-gray-600 uppercase">Contexto</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Editor Desktop */}
                                <div className="flex-1 bg-[#050505] p-8 overflow-y-auto stich-scrollbar">
                                    <div className="max-w-3xl space-y-8">
                                        <div className="space-y-1 relative">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">DIRECCIÓN_DESTINO</label>
                                                <span className="text-[8px] font-mono text-[#3B82F6]">SMTP_GMAIL_V14</span>
                                            </div>
                                            <input 
                                                type="email" 
                                                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-5 py-3 text-sm focus:border-[#3B82F6] outline-none transition-all font-mono text-white"
                                                placeholder="CORREO@DESTINO.COM"
                                                value={formData.to}
                                                onChange={(e) => {
                                                    setFormData({...formData, to: e.target.value});
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                            />
                                            {showSuggestions && formData.to && (
                                                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[#0A0A0A] border border-[#262626] rounded-sm z-50 shadow-2xl max-h-48 overflow-y-auto stich-scrollbar divide-y divide-[#262626]">
                                                    {contactSuggestions
                                                        .filter(c => c.email.toLowerCase().includes(formData.to.toLowerCase()) || (c.name && c.name.toLowerCase().includes(formData.to.toLowerCase())))
                                                        .map((suggestion, idx) => (
                                                            <div 
                                                                key={idx}
                                                                onClick={() => {
                                                                    setFormData({...formData, to: suggestion.email});
                                                                    setShowSuggestions(false);
                                                                }}
                                                                className="p-3 hover:bg-[#111111] cursor-pointer group transition-all"
                                                            >
                                                                <p className="text-xs text-white font-medium group-hover:text-[#3B82F6] transition-colors">{suggestion.name || 'Sin Nombre'}</p>
                                                                <p className="text-[9px] text-gray-600 font-mono tracking-tighter">{suggestion.email}</p>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-2 block">ASUNTO_CABECERA</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-5 py-3 text-sm focus:border-[#3B82F6] outline-none transition-all font-semibold tracking-tight text-white font-mono uppercase"
                                                placeholder="INGRESAR_ASUNTO..."
                                                value={formData.subject}
                                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-2 block">BUFFER_CUERPO_MENSAJE</label>
                                            <textarea 
                                                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-5 py-4 text-sm focus:border-[#3B82F6] outline-none transition-all min-h-[300px] resize-none leading-relaxed text-slate-300 font-sans"
                                                placeholder="ESCRIBIR_PROTOCOLO_MENSAJE..."
                                                value={formData.message}
                                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                            ></textarea>
                                        </div>

                                        {/* Adjuntos UI Desktop */}
                                        <div className="space-y-4 pt-4 border-t border-[#262626]">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">ADJUNTOS_MULTIMEDIA</label>
                                                <input type="file" id="file-upload-desktop" className="hidden" multiple onChange={handleFileChange} />
                                                <label htmlFor="file-upload-desktop" className="cursor-pointer flex items-center gap-2 text-[9px] font-bold text-[#3B82F6] hover:text-white transition-colors uppercase tracking-widest">
                                                    <span className="material-symbols-outlined notranslate text-sm" translate="no">attach_file</span>
                                                    INSERTAR_ARCHIVO
                                                </label>
                                            </div>
                                            {attachments.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {attachments.map((file, idx) => (
                                                        <div key={idx} className="bg-[#0A0A0A] border border-[#262626] p-3 rounded-sm flex items-center justify-between group">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <span className="material-symbols-outlined notranslate text-gray-600 text-sm" translate="no">
                                                                    {file.type.includes('image') ? 'image' : 'description'}
                                                                </span>
                                                                <span className="text-[9px] text-white truncate font-mono">{file.name}</span>
                                                            </div>
                                                            <button onClick={() => removeAttachment(idx)} className="text-gray-700 hover:text-red-500 transition-colors">
                                                                <span className="material-symbols-outlined notranslate text-sm" translate="no">close</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-[#262626] bg-[#000000] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={`w-2 h-2 rounded-full ${isSending ? 'bg-[#3B82F6] animate-pulse' : 'bg-green-500'}`}></span>
                                    <span className="text-[9px] font-mono text-gray-700 tracking-[0.3em]">TRANS_SEGURA_LISTA</span>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setIsRedactOpen(false)} className="px-6 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:text-white transition-colors">CANCELAR</button>
                                    <button 
                                        onClick={handleSendDirect} 
                                        disabled={isSending}
                                        className="bg-white hover:bg-gray-200 disabled:opacity-20 text-black px-12 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl"
                                    >
                                        {isSending ? (
                                            <><span className="animate-spin material-symbols-outlined text-sm">cycle</span>TRANSMITIENDO</>
                                        ) : (
                                            <><span className="material-symbols-outlined notranslate text-sm" translate="no">rocket_launch</span>DESPLEGAR_AHORA</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* END DESKTOP REDACT BOX */}

                        {/* MOBILE REDACT BOX */}
                        <div className="md:hidden flex flex-col h-full bg-black">
                            <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#050505]">
                                <h2 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">REDACTOR_MVL_V1</h2>
                                <button onClick={() => setIsRedactOpen(false)} className="p-2 text-gray-600">
                                    <span className="material-symbols-outlined notranslate" translate="no">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                {/* Destinatario & Asunto Mobile */}
                                <div className="space-y-4">
                                    <div className="space-y-1 relative">
                                        <label className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">PARA</label>
                                        <input 
                                            type="email" 
                                            className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-3 py-2 text-xs focus:border-[#3B82F6] outline-none text-white font-mono"
                                            placeholder="CORREO@DESTINO.COM"
                                            value={formData.to}
                                            onChange={(e) => setFormData({...formData, to: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">ASUNTO</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm px-3 py-2 text-xs focus:border-[#3B82F6] outline-none text-white font-bold uppercase tracking-tight"
                                            placeholder="ASUNTO_DEL_MENSAJE"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {/* AI Helper Mobile (Collapsible-like simplified) */}
                                <div className="bg-[#050505] border border-[#262626] p-4 rounded-sm space-y-3">
                                    <div className="flex items-center gap-2 text-[#3B82F6]">
                                        <span className="material-symbols-outlined notranslate text-xs" translate="no">auto_awesome</span>
                                        <span className="text-[8px] font-bold uppercase tracking-widest">ASISTENTE_IA</span>
                                    </div>
                                    <textarea 
                                        placeholder="INDICACIONES PARA LA IA..."
                                        className="w-full bg-black border border-[#262626] rounded-sm p-3 text-[10px] text-blue-400 outline-none h-24 resize-none font-mono"
                                        value={formData.iaPrompt}
                                        onChange={(e) => setFormData({...formData, iaPrompt: e.target.value})}
                                    />
                                    <button 
                                        onClick={handleIACompose}
                                        disabled={isGeneratingIA || !formData.iaPrompt}
                                        className="w-full bg-[#111] border border-[#3B82F6] text-[#3B82F6] py-2 rounded-sm text-[9px] font-bold uppercase tracking-widest"
                                    >
                                        {isGeneratingIA ? 'GENERANDO...' : 'REDACTAR_CON_IA'}
                                    </button>
                                </div>

                                {/* Body Mobile */}
                                <div className="space-y-1">
                                    <label className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">MENSAJE</label>
                                    <textarea 
                                        className="w-full bg-[#0A0A0A] border border-[#262626] rounded-sm p-3 text-xs focus:border-[#3B82F6] outline-none min-h-[300px] text-gray-300 leading-relaxed"
                                        placeholder="CUERPO_DEL_MENSAJE..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    />
                                </div>

                                {/* Attachments Mobile */}
                                <div className="pt-4 border-t border-[#262626] space-y-3">
                                    <input type="file" id="file-upload-mobile" className="hidden" multiple onChange={handleFileChange} />
                                    <label htmlFor="file-upload-mobile" className="flex items-center justify-center gap-2 text-[9px] font-bold text-gray-400 border border-dashed border-[#262626] py-4 rounded-sm uppercase tracking-widest hover:text-white transition-colors">
                                        <span className="material-symbols-outlined notranslate text-sm" translate="no">attach_file</span>
                                        AÑADIR_ARCHIVOS
                                    </label>
                                    {attachments.length > 0 && (
                                        <div className="grid grid-cols-1 gap-2">
                                            {attachments.map((file, idx) => (
                                                <div key={idx} className="bg-[#050505] border border-[#262626] p-2 rounded-sm flex items-center justify-between">
                                                    <span className="text-[8px] text-white truncate font-mono max-w-[200px]">{file.name}</span>
                                                    <button onClick={() => removeAttachment(idx)} className="text-red-500">
                                                        <span className="material-symbols-outlined notranslate text-sm" translate="no">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Footer */}
                            <div className="p-4 border-t border-[#262626] bg-[#050505]">
                                <button 
                                    onClick={handleSendDirect} 
                                    disabled={isSending}
                                    className="w-full bg-[#3B82F6] text-white py-4 rounded-sm text-[11px] font-black uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    {isSending ? (
                                        <><span className="animate-spin material-symbols-outlined text-sm">cycle</span>ENVIANDO</>
                                    ) : (
                                        <><span className="material-symbols-outlined notranslate text-sm" translate="no">send</span>DESPLEGAR_AHORA</>
                                    )}
                                </button>
                            </div>
                        </div>
                        {/* END MOBILE REDACT BOX */}

                    </div>
                </div>
            )}
        </div>
    );
};
