import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateImageWithGemini } from '../../lib/ai';
import { Sparkles, Calendar, User as UserIcon, Check, Loader2, Send, Download, Eye, AlertCircle, Trash2, Copy, Upload } from 'lucide-react';

interface Post {
    title: string;
    description: string;
    content_type: 'flyer' | 'video' | 'post';
    target_date: string;
    platform: 'Facebook' | 'Instagram' | 'YouTube' | 'TikTok';
    image_prompt: string;
    reason: string;
    image_url?: string;
}

interface PlannedContentCardProps {
    post: Post;
    users: Array<{ id: string; fullName: string; role: string }>;
    onTaskCreated: () => void;
    onDelete?: () => void;
    onUpdatePost?: (updatedPost: Post) => void;
}

const PLATFORM_COLORS = {
    'Facebook': 'border-[#00A2FF]/30 text-[#00A2FF] bg-[#00A2FF]/5',
    'Instagram': 'border-[#FF0055]/30 text-[#FF0055] bg-[#FF0055]/5',
    'YouTube': 'border-[#FF0000]/30 text-[#FF0000] bg-[#FF0000]/5',
    'TikTok': 'border-[#00F2FE]/30 text-[#00F2FE] bg-[#00F2FE]/5',
};

const TYPE_COLORS = {
    'flyer': 'border-purple-500/30 text-purple-400 bg-purple-500/5',
    'video': 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    'post': 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
};

export const PlannedContentCard: React.FC<PlannedContentCardProps> = ({ post, users, onTaskCreated, onDelete, onUpdatePost }) => {
    const { user } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [assigning, setAssigning] = useState<boolean>(false);
    const [assigned, setAssigned] = useState<boolean>(false);
    
    // Flyer Generation States
    const [generatingFlyer, setGeneratingFlyer] = useState<boolean>(false);
    const [generatedFlyerUrl, setGeneratedFlyerUrl] = useState<string | null>(post.image_url || null);
    
    // Webhook/n8n settings
    const [sendingN8n, setSendingN8n] = useState<boolean>(false);
    const [n8nSent, setN8nSent] = useState<boolean>(false);

    React.useEffect(() => {
        setGeneratedFlyerUrl(post.image_url || null);
    }, [post.image_url]);

    const handleAssignTask = async () => {
        if (!selectedUserId) return;
        setAssigning(true);
        try {
            // 1. Insertar en la tabla de tareas
            const taskData = {
                title: post.title,
                description: post.description,
                status: 'Pendiente',
                due_date: post.target_date,
                publication_date: post.target_date,
                task_type: post.content_type === 'flyer' ? 'Flyer' : (post.content_type === 'video' ? 'Video' : 'Documento'),
                assigned_to: selectedUserId,
                created_by: user?.id || null
            };

            const { data: newTask, error: taskError } = await supabase
                .from('tasks')
                .insert([taskData])
                .select()
                .single();

            if (taskError) throw taskError;

            // 2. Insertar espejo en audiovisual_planning para el módulo ContentCalendarGrid
            const planningData = {
                title: post.title,
                description: post.description,
                content_type: post.content_type,
                status: 'Planificado',
                target_date: post.target_date,
                assigned_to: selectedUserId,
                task_id: newTask.id,
                media_url: generatedFlyerUrl || null,
                social_copy: post.description
            };

            const { error: planningError } = await supabase
                .from('audiovisual_planning')
                .insert([planningData]);

            if (planningError) console.error("Error al sincronizar con audiovisual_planning:", planningError);

            setAssigned(true);
            onTaskCreated();
        } catch (err) {
            console.error("Error al crear tarea:", err);
            alert("Ocurrió un error al intentar crear la tarea.");
        } finally {
            setAssigning(false);
        }
    };

    const handleGenerateFlyer = async () => {
        setGeneratingFlyer(true);
        try {
            const dataUrl = await generateImageWithGemini(post.image_prompt);
            setGeneratedFlyerUrl(dataUrl);
            if (onUpdatePost) {
                onUpdatePost({
                    ...post,
                    image_url: dataUrl
                });
            }
        } catch (err: any) {
            console.error("Error al generar flyer:", err);
            alert(`No se pudo generar la imagen de referencia. Detalle: ${err.message || 'Error desconocido'}`);
        } finally {
            setGeneratingFlyer(false);
        }
    };

    const handleCopyPrompt = () => {
        const brandGuidelines = `
            CRITICAL DESIGN RULES (REVISTA ACS BRAND MANUAL):
            - ASPECT RATIO: Must be square (1:1 aspect ratio) suitable for Instagram and Facebook feed.
            - COLOR PALETTE: Deep Institutional Blue (#153ABF), Secondary Blue (#2263D9), Golden Yellow (#FEC841), Orange (#F4982C), White (#FFFFFF). Use white as base/background, blue as dominant elements, yellow/orange as accents.
            - GRAPHIC STYLE: Clean, premium, academic, professional, social sciences theme.
            - LAYOUT DETAILS: Incorporate subtle elements such as double exposure silhouettes, clean diagonal geometric cuts, or background topographic/grid lines.
            - TEXT: All readable text in the image must be in SPANISH and written precisely (e.g. "Territorios en Voz", "Presentación Oficial ACS"). Use clean sans-serif typography like Montserrat or Cocomat Pro.
            - SAFE SPACE FOR LOGOS: DO NOT draw any logos inside the image. Leave the top-left corner completely clear and clean so the official ACS logo can be superimposed later. Leave the top-right corner clear for the university logo.
        `;
        const fullPrompt = `${post.image_prompt}. ${brandGuidelines.trim()}`;
        
        navigator.clipboard.writeText(fullPrompt)
            .then(() => alert("¡Prompt completo copiado al portapapeles! Puedes pegarlo en ChatGPT o tu motor preferido."))
            .catch(err => {
                console.error("Error al copiar al portapapeles:", err);
                alert("No se pudo copiar automáticamente. Aquí está el prompt:\n\n" + fullPrompt);
            });
    };

    const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                const dataUrl = reader.result;
                setGeneratedFlyerUrl(dataUrl);
                if (onUpdatePost) {
                    onUpdatePost({
                        ...post,
                        image_url: dataUrl
                    });
                }
            }
        };
        reader.onerror = () => {
            alert("Ocurrió un error al leer el archivo seleccionado.");
        };
        reader.readAsDataURL(file);
    };

    const handleSendToN8n = async () => {
        // Buscar webhook de n8n en el localStorage o usar uno de prueba
        const webhookUrl = localStorage.getItem('n8n_webhook_url') || '';
        if (!webhookUrl) {
            const customUrl = prompt("Ingresa la URL del webhook de tu n8n para enviar la automatización:");
            if (!customUrl) return;
            localStorage.setItem('n8n_webhook_url', customUrl);
        }

        setSendingN8n(true);
        try {
            const currentWebhook = localStorage.getItem('n8n_webhook_url');
            const res = await fetch(currentWebhook!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...post,
                    generated_flyer_draft: generatedFlyerUrl,
                    triggered_by: user?.fullName || user?.email
                })
            });

            if (!res.ok) throw new Error("Webhook request failed");
            setN8nSent(true);
            setTimeout(() => setN8nSent(false), 3000);
        } catch (err) {
            console.error("Error al enviar a n8n:", err);
            alert("Error al conectar con n8n. Revisa la URL en la configuración.");
        } finally {
            setSendingN8n(false);
        }
    };

    return (
        <div className="bg-[#0A0A0A] border border-[#222] hover:border-exec-blue/30 transition-all p-5 flex flex-col justify-between rounded-sm relative min-h-[300px] group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#222] to-transparent group-hover:via-exec-blue/40"></div>
            
            <div className="space-y-4">
                {/* Cabecera de la publicación */}
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-[10px] font-black text-gray-500 tracking-wider flex items-center gap-1.5 uppercase">
                        <Calendar className="w-3.5 h-3.5 text-exec-blue" />
                        {post.target_date.split('-').reverse().join('/')}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-none ${PLATFORM_COLORS[post.platform] || 'border-gray-800 text-gray-400 bg-gray-800/10'}`}>
                            {post.platform}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-none ${TYPE_COLORS[post.content_type] || 'border-gray-800 text-gray-400 bg-gray-800/10'}`}>
                            {post.content_type}
                        </span>
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="p-1 text-gray-500 hover:text-red-500 hover:bg-white/5 transition-all rounded-none border border-transparent hover:border-red-500/20 ml-0.5"
                                title="Eliminar Publicación Planificada"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Razón de la publicación */}
                <div className="flex items-start gap-1.5 bg-white/[0.02] border border-white/5 p-2 text-[9px] font-bold text-gray-400 rounded-none uppercase tracking-wide">
                    <AlertCircle className="w-3.5 h-3.5 text-exec-blue flex-shrink-0" />
                    <span>Insumo: {post.reason}</span>
                </div>

                {/* Título y Copy */}
                <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-white uppercase tracking-tight group-hover:text-exec-blue transition-colors line-clamp-1">
                        {post.title}
                    </h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-4 font-medium">
                        {post.description}
                    </p>
                </div>
            </div>

            {/* Preview de Flyer Generado / Estado de Carga */}
            {(generatingFlyer || generatedFlyerUrl) && (
                <div className="my-4 border border-exec-blue/20 rounded-none overflow-hidden relative group/img aspect-square bg-black/40 flex items-center justify-center min-h-[120px]">
                    {generatingFlyer ? (
                        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center w-full h-full bg-exec-blue/5">
                            <Loader2 className="w-8 h-8 text-exec-blue animate-spin" />
                            <span className="text-[9px] font-black text-exec-blue uppercase tracking-[0.15em] animate-pulse">
                                Diseñando Flyer con Inteligencia Artificial...
                            </span>
                        </div>
                    ) : (
                        <>
                            <img src={generatedFlyerUrl!} alt="Flyer Draft" className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-300" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <a href={generatedFlyerUrl!} download={`flyer_${post.title.replace(/\s+/g, '_')}.png`} className="p-2 bg-exec-blue text-black hover:bg-blue-400 transition-all rounded-sm">
                                    <Download size={14} />
                                </a>
                                <button onClick={() => {
                                    const newWin = window.open();
                                    newWin?.document.write(`<img src="${generatedFlyerUrl}" style="max-width:100%; height:auto;" />`);
                                }} className="p-2 bg-white/10 hover:bg-white/20 text-white transition-all rounded-sm border border-white/10">
                                    <Eye size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Panel de Acción */}
            <div className="pt-4 border-t border-white/5 mt-4 space-y-3">
                <div className="flex items-center gap-2">
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        disabled={assigned}
                        className="flex-1 bg-black border border-[#222] text-gray-300 text-[10px] uppercase font-bold tracking-wider rounded-none px-2.5 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all"
                    >
                        <option value="">Seleccionar Responsable</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                        ))}
                    </select>
                    
                    <button
                        onClick={handleAssignTask}
                        disabled={assigning || assigned || !selectedUserId}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-1.5 ${
                            assigned 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-exec-blue hover:bg-blue-400 text-black disabled:opacity-40'
                        }`}
                    >
                        {assigning ? <Loader2 size={12} className="animate-spin" /> : (assigned ? <Check size={12} /> : <Send size={12} />)}
                        {assigned ? 'ASIGNADO' : 'ASIGNAR'}
                    </button>
                </div>

                {/* Acciones de IA y n8n */}
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerateFlyer}
                        disabled={generatingFlyer || assigned}
                        className="flex-1 py-1.5 bg-black border border-exec-blue/20 hover:border-exec-blue/50 hover:bg-exec-blue/5 text-exec-blue text-[8px] font-black uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-1.5 disabled:opacity-30"
                    >
                        {generatingFlyer ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        {generatedFlyerUrl ? 'REGENERAR MOCKUP' : 'CREAR MOCKUP AI'}
                    </button>

                    <button
                        onClick={handleSendToN8n}
                        disabled={sendingN8n || n8nSent}
                        className="px-3 py-1.5 bg-black border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-1.5 disabled:opacity-30"
                        title="Enviar automatización a n8n"
                    >
                        {sendingN8n ? <Loader2 size={10} className="animate-spin" /> : (n8nSent ? <Check size={10} className="text-green-500" /> : <Send size={10} />)}
                        {n8nSent ? 'ENVIADO' : 'N8N'}
                    </button>
                </div>

                <div className="flex justify-between items-center text-[8px] font-black tracking-widest text-gray-500 border-t border-white/5 pt-3 mt-1">
                    <button
                        onClick={handleCopyPrompt}
                        className="hover:text-exec-blue transition-colors uppercase flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
                        title="Copiar prompt completo con manual de marca para ChatGPT"
                    >
                        <Copy size={10} /> COPIAR PROMPT
                    </button>
                    
                    <label className="cursor-pointer hover:text-[#00D1B2] transition-colors uppercase flex items-center gap-1">
                        <Upload size={10} />
                        <span>REMPLAZAR FLYER</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadImage}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};
