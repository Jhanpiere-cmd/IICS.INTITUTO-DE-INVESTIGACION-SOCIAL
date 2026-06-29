import React, { useState, useEffect, useRef } from 'react';
import { User, UserPlus, ArrowLeft, Search, Check, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';

interface TeamResponsibilitiesTabProps {
    eventId: string;
}

interface TeamMember {
    id: string;
    full_name: string;
    role: string;
    avatar_url?: string;
    avatarUrl?: string; // Fallback for some database schemas
}

interface Responsibility {
    id?: string;
    responsibility_type: string;
    assigned_to: string | null;
    assigned_to_name?: string | null;
    notes: string;
    is_external?: boolean;
}

const RESPONSIBILITY_TYPES = [
    { value: 'envio_oficios', label: 'Envío de Oficios', icon: '📄' },
    { value: 'logistica', label: 'Logística y Coordinación', icon: '📦' },
    { value: 'produccion_contenido', label: 'Producción de Contenido (Flyers, Banners)', icon: '🎨' },
    { value: 'relaciones_institucionales', label: 'Relaciones Institucionales', icon: '🤝' },
    { value: 'moderacion', label: 'Moderación del Evento', icon: '🎤' }
];

// Custom Member Selector Component for VIP UX
function MemberSelector({ 
    members, 
    value, 
    onChange, 
    placeholder = "Sin asignar",
    onOpenChange
}: { 
    members: TeamMember[], 
    value: string | null, 
    onChange: (id: string) => void,
    placeholder?: string,
    onOpenChange?: (isOpen: boolean) => void
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedMember = members.find(m => m.id === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                onOpenChange?.(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onOpenChange]);

    const handleToggle = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        onOpenChange?.(nextState);
    };

    const getAvatar = (m: TeamMember) => m.avatar_url || m.avatarUrl;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#050505] border border-[#262626] hover:border-exec-blue/50 transition-all rounded-none group active:scale-[0.99]"
            >
                <div className="flex items-center gap-2.5 overflow-hidden">
                    {selectedMember ? (
                        <>
                            <div className="w-6 h-6 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-exec-blue/40 transition-colors">
                                {getAvatar(selectedMember) ? (
                                    <img 
                                        src={getAvatar(selectedMember)} 
                                        alt="" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedMember.full_name) + '&background=0088ff&color=fff';
                                        }}
                                    />
                                ) : (
                                    <User size={12} className="text-exec-blue" />
                                )}
                            </div>
                            <div className="text-left truncate">
                                <p className="text-[10px] font-black text-white truncate uppercase tracking-tight leading-none group-hover:text-exec-blue transition-colors">{selectedMember.full_name}</p>
                                <p className="text-[8px] text-gray-500 truncate uppercase mt-0.5 font-bold tracking-widest">{selectedMember.role}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-6 h-6 rounded-none bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
                                <User size={12} className="text-gray-600" />
                            </div>
                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{placeholder}</span>
                        </>
                    )}
                </div>
                <ChevronDown size={12} className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-[#0D0D0D] border border-exec-blue/30 shadow-[0_15px_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-top-1 duration-150">
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar bg-black/40 backdrop-blur-sm">
                        <button
                            type="button"
                            onClick={() => { onChange(''); setIsOpen(false); onOpenChange?.(false); }}
                            className="w-full px-4 py-2 text-left hover:bg-white/10 text-[8px] font-black text-gray-500 hover:text-gray-300 uppercase tracking-[0.2em] border-b border-white/5 transition-colors"
                        >
                            SIN ASIGNAR / ELIMINAR
                        </button>
                        {members.map(member => (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => { onChange(member.id); setIsOpen(false); onOpenChange?.(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-exec-blue/10 transition-all border-b border-white/5 last:border-0 group/item ${value === member.id ? 'bg-exec-blue/15 border-l-2 border-l-exec-blue' : ''}`}
                            >
                                <div className="w-7 h-7 rounded-none bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner group-hover/item:border-exec-blue/40 transition-colors">
                                    {getAvatar(member) ? (
                                        <img 
                                            src={getAvatar(member)} 
                                            alt="" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.full_name) + '&background=0088ff&color=fff';
                                            }}
                                        />
                                    ) : (
                                        <User size={14} className="text-gray-600" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-tight group-hover/item:text-exec-blue transition-colors">{member.full_name}</p>
                                    <p className="text-[8px] text-gray-500 uppercase mt-0.5 truncate font-bold tracking-widest">{member.role}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function TeamResponsibilitiesTab({ eventId }: TeamResponsibilitiesTabProps) {
    const { showToast } = useToast();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [eventData, setEventData] = useState<any>(null);
    const [openSelectorType, setOpenSelectorType] = useState<string | null>(null);

    useEffect(() => {
        loadEventData();
        loadTeamMembers();
        loadResponsibilities();
    }, [eventId]);

    async function loadEventData() {
        const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (data) setEventData(data);
    }

    async function loadTeamMembers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role, avatar_url, avatarUrl')
                .order('full_name');

            if (error) throw error;
            setTeamMembers(data || []);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    }

    async function loadResponsibilities() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('event_responsibilities')
                .select('*')
                .eq('event_id', eventId);

            if (error) throw error;

            if (!data || data.length === 0) {
                const initialResponsibilities: Responsibility[] = RESPONSIBILITY_TYPES.map(type => ({
                    responsibility_type: type.value,
                    assigned_to: null,
                    assigned_to_name: '',
                    notes: '',
                    is_external: false
                }));
                setResponsibilities(initialResponsibilities);
            } else {
                const existingTypes = data.map(r => r.responsibility_type);
                const missingTypes = RESPONSIBILITY_TYPES.filter(t => !existingTypes.includes(t.value));

                const allResponsibilities = [
                    ...data.map(r => ({
                        ...r,
                        is_external: !r.assigned_to && !!r.assigned_to_name
                    })),
                    ...missingTypes.map(type => ({
                        responsibility_type: type.value,
                        assigned_to: null,
                        assigned_to_name: '',
                        notes: '',
                        is_external: false
                    }))
                ];
                setResponsibilities(allResponsibilities);
            }
        } catch (error) {
            console.error('Error loading responsibilities:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await supabase
                .from('event_responsibilities')
                .delete()
                .eq('event_id', eventId);

            const responsibilitiesToInsert = responsibilities
                .filter(r => r.assigned_to || r.assigned_to_name)
                .map(r => ({
                    event_id: eventId,
                    responsibility_type: r.responsibility_type,
                    assigned_to: r.is_external ? null : r.assigned_to,
                    assigned_to_name: r.is_external ? r.assigned_to_name : null,
                    notes: r.notes || null
                }));

            const { data: { user } } = await supabase.auth.getUser();

            if (responsibilitiesToInsert.length > 0) {
                const { error } = await supabase
                    .from('event_responsibilities')
                    .insert(responsibilitiesToInsert);

                if (error) throw error;

                for (const resp of responsibilitiesToInsert) {
                    if (resp.assigned_to && eventData) {
                        try {
                            const taskTitle = `Responsabilidad: ${getResponsibilityLabel(resp.responsibility_type || '')}`;
                            await supabase
                                .from('tasks')
                                .insert({
                                    title: taskTitle,
                                    description: `Responsabilidad para evento: ${eventData.title}\n\n${resp.notes || ''}`,
                                    assigned_to: resp.assigned_to,
                                    due_date: eventData.scheduled_date,
                                    status: 'pendiente',
                                    priority: 'media',
                                    created_by: user?.id || null
                                });
                        } catch (err) {
                            console.error('Error syncing task:', err);
                        }
                    }
                }
            }

            showToast({
                type: 'success',
                title: 'PLAN_GUARDADO',
                message: 'Las responsabilidades se han sincronizado correctamente.'
            });
            loadResponsibilities();
        } catch (error) {
            console.error('Error saving responsibilities:', error);
            showToast({
                type: 'error',
                title: 'ERROR_DE_GUARDADO',
                message: 'No se pudieron actualizar las responsabilidades.'
            });
        } finally {
            setSaving(false);
        }
    }

    function updateResponsibility(type: string, field: 'assigned_to' | 'notes' | 'assigned_to_name', value: string) {
        setResponsibilities(prev =>
            prev.map(r =>
                r.responsibility_type === type
                    ? { ...r, [field]: value }
                    : r
            )
        );
    }

    function toggleExternal(type: string) {
        setResponsibilities(prev =>
            prev.map(r =>
                r.responsibility_type === type
                    ? { ...r, is_external: !r.is_external, assigned_to: null, assigned_to_name: '' }
                    : r
            )
        );
    }

    function getResponsibilityLabel(type: string) {
        return RESPONSIBILITY_TYPES.find(t => t.value === type)?.label || type;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-exec-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-2 space-y-2">
            <div className="flex items-center gap-3 px-2 py-1">
                <button 
                    onClick={() => (window as any).setActiveEventSubTab?.(null)}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none mb-1 shadow-sm">Equipo Operativo</h3>
                    <p className="text-[8px] text-exec-blue font-bold uppercase tracking-widest opacity-70">Responsabilidades & Roles</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pb-20 md:pb-4">
                {RESPONSIBILITY_TYPES.map(type => {
                    const responsibility = responsibilities.find(r => r.responsibility_type === type.value);
                    const isSelectorOpen = openSelectorType === type.value;

                    return (
                        <div 
                            key={type.value} 
                            className={`bg-[#080808] rounded-none border border-[#1A1A1A] p-3 hover:border-exec-blue/30 transition-all group relative ${isSelectorOpen ? 'z-50' : 'z-10'}`}
                        >
                            {/* Decoration */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.015] group-hover:opacity-[0.03] transition-opacity">
                                    <span className="text-6xl grayscale">{type.icon}</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 h-full relative z-10">
                                <div className="text-lg p-2 bg-black rounded-none border border-[#1A1A1A] group-hover:border-exec-blue/40 transition-colors shrink-0 self-start">
                                    {type.icon}
                                </div>
                                <div className="flex-1 space-y-3 min-w-0">
                                    <h3 className="font-black text-[10px] text-white uppercase tracking-[0.2em] leading-none border-l-2 border-exec-blue pl-2 py-0.5 group-hover:text-exec-blue transition-colors">
                                        {type.label}
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 px-2 py-1.5 bg-black/50 border border-white/5">
                                                <input
                                                    type="checkbox"
                                                    id={`ext-${type.value}`}
                                                    checked={responsibility?.is_external || false}
                                                    onChange={() => toggleExternal(type.value)}
                                                    className="w-3.5 h-3.5 rounded-none border-white/10 bg-black text-exec-blue focus:ring-exec-blue focus:ring-offset-black"
                                                />
                                                <label htmlFor={`ext-${type.value}`} className="text-[8px] text-gray-500 cursor-pointer select-none uppercase font-black tracking-widest">
                                                    Colaborador Externo
                                                </label>
                                            </div>

                                            {responsibility?.is_external ? (
                                                <input
                                                    type="text"
                                                    placeholder="Nombre del responsable externo..."
                                                    value={responsibility?.assigned_to_name || ''}
                                                    onChange={(e) => updateResponsibility(type.value, 'assigned_to_name', e.target.value)}
                                                    className="w-full px-3 py-2 border border-[#1A1A1A] rounded-none focus:border-exec-blue/50 bg-[#050505] text-white text-[10px] font-bold uppercase placeholder-gray-800 outline-none transition-all tracking-wider"
                                                />
                                            ) : (
                                                <MemberSelector 
                                                    members={teamMembers}
                                                    value={responsibility?.assigned_to || ''}
                                                    onChange={(id) => updateResponsibility(type.value, 'assigned_to', id)}
                                                    onOpenChange={(isOpen) => setOpenSelectorType(isOpen ? type.value : null)}
                                                />
                                            )}
                                        </div>

                                        <div>
                                            <textarea
                                                value={responsibility?.notes || ''}
                                                onChange={(e) => updateResponsibility(type.value, 'notes', e.target.value)}
                                                placeholder="Instrucciones operativas..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-[#1A1A1A] rounded-none focus:border-exec-blue/50 bg-black text-white text-[10px] font-medium resize-none placeholder-gray-800 outline-none transition-all tracking-tight leading-snug"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 md:relative md:p-0 md:bg-transparent bg-[#050505] border-t border-white/5 md:border-t-0 flex justify-end z-30">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full md:w-auto px-10 py-3.5 bg-exec-blue hover:bg-blue-600 text-black rounded-none font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-exec-blue/20 disabled:opacity-50 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sincronizando...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            <span>Sincronizar Equipo</span>
                        </>
                    )}
                </button>
            </div>
        </div >
    );
}
