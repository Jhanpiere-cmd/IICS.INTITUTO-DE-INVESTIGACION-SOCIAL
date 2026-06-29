import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateAIContentPlan, fetchJournalPublicationsFeed } from '../../lib/ai';
import { PlannedContentCard } from './PlannedContentCard';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import { AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { Sparkles, Calendar, BookOpen, AlertCircle, Loader2, RefreshCw, Settings, Check, X, ShieldAlert } from 'lucide-react';

export const AIContentPlanner: React.FC = () => {
    const { user } = useAuth();
    const [startDate, setStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    // Insumos
    const [events, setEvents] = useState<any[]>([]);
    const [publications, setPublications] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    
    // Estados de Carga
    const [loadingInputs, setLoadingInputs] = useState<boolean>(false);
    const [generating, setGenerating] = useState<boolean>(false);
    const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
    
    // Resultados
    const [plannedPosts, setPlannedPosts] = useState<any[]>([]);
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    // Configuraciones de n8n e IA
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [n8nUrl, setN8nUrl] = useState<string>('');
    const [huggingfaceKey, setHuggingfaceKey] = useState<string>('');
    const [mockupEngine, setMockupEngine] = useState<string>('nanobanana');
    const [cfToken, setCfToken] = useState<string>('');
    const [cfAccountId, setCfAccountId] = useState<string>('');
    const [cfModel, setCfModel] = useState<string>('@cf/leonardo/phoenix-1.0');
    const [segmindKey, setSegmindKey] = useState<string>('');
    const [segmindModel, setSegmindModel] = useState<string>('flux-schnell');
    const [kieToken, setKieToken] = useState<string>('');
    const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

    useEffect(() => {
        // Cargar configuraciones guardadas en localStorage
        const savedUrl = localStorage.getItem('n8n_webhook_url') || '';
        const savedHfKey = localStorage.getItem('huggingface_api_key') || '';
        
        let savedEngine = localStorage.getItem('mockup_image_engine') || 'nanobanana';
        if (savedEngine === 'cloudflare') {
            savedEngine = 'nanobanana';
            localStorage.setItem('mockup_image_engine', 'nanobanana');
        }

        const savedCfToken = localStorage.getItem('cloudflare_api_token') || import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '';
        const savedCfAccountId = localStorage.getItem('cloudflare_account_id') || import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '';
        
        let savedCfModel = localStorage.getItem('cloudflare_model') || '';
        if (savedCfModel === '@cf/leonardoai/phoenix-1.0') {
            savedCfModel = '@cf/leonardo/phoenix-1.0';
            localStorage.setItem('cloudflare_model', '@cf/leonardo/phoenix-1.0');
        }
        if (!savedCfModel) {
            savedCfModel = '@cf/leonardo/phoenix-1.0';
        }

        const savedSegmindKey = localStorage.getItem('segmind_api_key') || import.meta.env.VITE_SEGMIND_API_KEY || '';
        const savedSegmindModel = localStorage.getItem('segmind_model') || 'flux-schnell';
        const savedKieToken = localStorage.getItem('kie_api_token') || import.meta.env.VITE_KIE_API_TOKEN || '';

        setN8nUrl(savedUrl);
        setHuggingfaceKey(savedHfKey);
        setMockupEngine(savedEngine);
        setCfToken(savedCfToken);
        setCfAccountId(savedCfAccountId);
        setCfModel(savedCfModel);
        setSegmindKey(savedSegmindKey);
        setSegmindModel(savedSegmindModel);
        setKieToken(savedKieToken);

        loadProfiles();
        loadInputs();
        loadPlannedPosts();
    }, []);

    const loadPlannedPosts = async () => {
        setLoadingPlan(true);
        try {
            const { data, error } = await supabase
                .from('integration_tokens')
                .select('metadata')
                .eq('provider', 'ai_content_plan')
                .maybeSingle();
            
            if (error) throw error;
            if (data?.metadata && typeof data.metadata === 'object') {
                const meta = data.metadata as any;
                if (Array.isArray(meta.posts)) {
                    setPlannedPosts(meta.posts);
                }
            }
        } catch (err) {
            console.error("Error al cargar el plan de publicaciones de Supabase:", err);
        } finally {
            setLoadingPlan(false);
        }
    };

    const savePlanToSupabase = async (posts: any[]) => {
        try {
            const { error } = await supabase
                .from('integration_tokens')
                .upsert({
                    provider: 'ai_content_plan',
                    metadata: { posts },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'provider' });
            
            if (error) throw error;
        } catch (err) {
            console.error("Error al guardar el plan de publicaciones en Supabase:", err);
        }
    };

    const loadProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, "fullName", role, avatar_url')
                .order('"fullName"');
            
            if (error) throw error;
            setAllProfiles((data || []).map((p: any) => ({
                id: p.id,
                fullName: p.fullName || 'Usuario',
                role: p.role || 'Miembro'
            })));
        } catch (err) {
            console.error("Error cargando perfiles de SGR:", err);
        }
    };

    const loadInputs = async () => {
        setLoadingInputs(true);
        try {
            // 1. Cargar eventos académicos del SGR en el rango de fechas
            const { data: eventsData } = await supabase
                .from('events')
                .select('title, scheduled_date, event_type, description, is_paid, cost, is_online, location, meeting_link, certificate_type, certificate_price, registration_enabled, registration_slug')
                .gte('scheduled_date', startDate)
                .lte('scheduled_date', endDate);
            
            const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            const formattedEvents = (eventsData || []).map((e: any) => {
                let formattedDate = e.scheduled_date;
                if (e.scheduled_date) {
                    const parts = e.scheduled_date.split('-');
                    if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const day = parseInt(parts[2], 10);
                        // Construct Date using local timezone constructor to prevent timezone off-by-one errors
                        const date = new Date(year, month, day);
                        const dayName = daysOfWeek[date.getDay()];
                        const monthName = months[date.getMonth()];
                        formattedDate = `${dayName} ${day} de ${monthName} de ${year}`;
                    }
                }

                const regUrl = e.registration_enabled && e.registration_slug 
                    ? `${window.location.origin}/registro/${e.registration_slug}` 
                    : null;

                return {
                    ...e,
                    formatted_date_with_day: formattedDate,
                    registration_url: regUrl
                };
            });

            setEvents(formattedEvents);

            // 2. Cargar publicaciones del feed de OJS / Seed
            const articles = await fetchJournalPublicationsFeed();
            setPublications(articles);

            // 3. Cargar festivos nacionales/regionales de la BD
            let holidaysList: any[] = [];
            try {
                const { data: holidaysData, error: holidaysError } = await supabase
                    .from('calendar_holidays')
                    .select('name, date_day, date_month, scope, description');
                
                if (!holidaysError && holidaysData) {
                    holidaysList = holidaysData;
                }
            } catch (hErr) {
                console.log("calendar_holidays no disponible, usando fallbacks locales.");
            }

            // Fallback en caso de que no haya festivos en la BD
            if (holidaysList.length === 0) {
                holidaysList = [
                    { name: 'Año Nuevo', date_day: 1, date_month: 1, scope: 'national' },
                    { name: 'Día del Trabajo', date_day: 1, date_month: 5, scope: 'national' },
                    { name: 'Fundación de Cajamarca', date_day: 3, date_month: 1, scope: 'regional' },
                    { name: 'Batalla de San Pablo', date_day: 13, date_month: 7, scope: 'regional' },
                    { name: 'Aniversario de la Revista ACS', date_day: 15, date_month: 10, scope: 'regional' }
                ];
            }

            // Filtrar festivos en el rango de meses/días consultado
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            const filteredHolidays = holidaysList.filter(h => {
                // Comprobamos si el día y mes encajan en el rango sin importar el año
                const holidayDate = new Date(startD.getFullYear(), h.date_month - 1, h.date_day);
                return holidayDate >= startD && holidayDate <= endD;
            });

            setHolidays(filteredHolidays);
        } catch (err) {
            console.error("Error al cargar insumos:", err);
        } finally {
            setLoadingInputs(false);
        }
    };

    const handleSaveSettings = () => {
        localStorage.setItem('n8n_webhook_url', n8nUrl);
        localStorage.setItem('huggingface_api_key', huggingfaceKey);
        localStorage.setItem('mockup_image_engine', mockupEngine);
        localStorage.setItem('cloudflare_api_token', cfToken);
        localStorage.setItem('cloudflare_account_id', cfAccountId);
        localStorage.setItem('cloudflare_model', cfModel);
        localStorage.setItem('segmind_api_key', segmindKey);
        localStorage.setItem('segmind_model', segmindModel);
        localStorage.setItem('kie_api_token', kieToken);
        setSettingsSaved(true);
        setTimeout(() => {
            setSettingsSaved(false);
            setShowSettings(false);
        }, 1500);
    };

    const handleGeneratePlan = async () => {
        setGenerating(true);
        try {
            const plan = await generateAIContentPlan({
                startDate,
                endDate,
                events,
                publications,
                holidays
            }, aiConfig);

            if (plan && Array.isArray(plan)) {
                setPlannedPosts(plan);
                await savePlanToSupabase(plan);
            } else if (plan && plan.posts && Array.isArray(plan.posts)) {
                setPlannedPosts(plan.posts);
                await savePlanToSupabase(plan.posts);
            } else {
                alert("La IA retornó un formato no válido. Reintenta.");
            }
        } catch (err) {
            console.error("Error en la llamada de planificación:", err);
            alert("Ocurrió un error. Verifica la conexión con el motor AI.");
        } finally {
            setGenerating(false);
        }
    };

    const handleDeletePost = async (index: number) => {
        const updated = plannedPosts.filter((_, idx) => idx !== index);
        setPlannedPosts(updated);
        await savePlanToSupabase(updated);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header del Planificador */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#050505] border border-exec-border p-6 rounded-sm relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-exec-blue/40 to-transparent"></div>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-exec-blue animate-pulse" />
                        Planificación de Contenidos por IA
                    </h2>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-exec-blue"></span>
                        Algoritmo de Neuromarketing y Alineación Editorial ACS
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 bg-black border border-white/5 text-gray-400 hover:text-white rounded-none transition-colors"
                        title="Configurar Integraciones"
                    >
                        <Settings size={16} />
                    </button>
                    
                    <button
                        onClick={loadInputs}
                        disabled={loadingInputs}
                        className="px-4 py-2 bg-black border border-exec-border text-gray-300 text-[10px] font-bold uppercase tracking-widest rounded-none hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loadingInputs ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        RECARGAR INSUMOS
                    </button>
                </div>
            </div>

            {/* Configuración de n8n */}
            {showSettings && (
                <div className="bg-[#0A0A0A] border border-[#222] p-6 rounded-none space-y-6 animate-in slide-in-from-top-3 duration-250">
                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <h4 className="text-[10px] font-black text-white tracking-widest uppercase">Ajustes del Planificador de Contenidos</h4>
                        <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Webhook de automatización n8n</label>
                            <input
                                type="url"
                                value={n8nUrl}
                                onChange={(e) => setN8nUrl(e.target.value)}
                                placeholder="https://nuestro-n8n.com/g/webhook/..."
                                className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all font-mono"
                            />
                            <p className="text-[8px] text-gray-600 mt-2 uppercase tracking-wide">
                                Webhook para disparar flujos de trabajo en n8n y superponer el logo ACS a las piezas.
                            </p>
                        </div>
                        <div>
                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Motor de Generación de Imagen (Mockup)</label>
                            <select
                                value={mockupEngine}
                                onChange={(e) => setMockupEngine(e.target.value)}
                                className="w-full bg-black border border-[#222] text-gray-300 text-[10px] uppercase font-bold tracking-wider rounded-none px-2.5 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all"
                            >
                                <option value="flux">FLUX.1 (Hugging Face - Gratis)</option>
                                <option value="dalle">DALL-E 3 (OpenAI - Premium)</option>
                                <option value="cloudflare">Workers AI (Cloudflare - Gratis/Bajo Costo)</option>
                                <option value="segmind">Segmind API (100 Free Daily)</option>
                                <option value="nanobanana">Google Nano Banana (Kie AI)</option>
                            </select>
                            <p className="text-[8px] text-gray-600 mt-2 uppercase tracking-wide">
                                Elige el motor para generar tus flyers rápidos. DALL-E y Phoenix 1.0 son los mejores con textos.
                            </p>
                        </div>
                        <div>
                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Token de Hugging Face (Para Mockups/Flyers FLUX)</label>
                            <input
                                type="password"
                                value={huggingfaceKey}
                                onChange={(e) => setHuggingfaceKey(e.target.value)}
                                placeholder="hf_..."
                                disabled={mockupEngine !== 'flux'}
                                className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all font-mono disabled:opacity-40"
                            />
                            <p className="text-[8px] text-gray-600 mt-2 uppercase tracking-wide">
                                Requerido únicamente si utilizas el motor gratuito FLUX.1 de Hugging Face.
                            </p>
                        </div>
                    </div>

                    {/* Campos adicionales según motor */}
                    {mockupEngine === 'cloudflare' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Cloudflare Account ID</label>
                                <input
                                    type="text"
                                    value={cfAccountId}
                                    onChange={(e) => setCfAccountId(e.target.value)}
                                    placeholder="ID de Cuenta (dash.cloudflare.com)"
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Cloudflare API Token</label>
                                <input
                                    type="password"
                                    value={cfToken}
                                    onChange={(e) => setCfToken(e.target.value)}
                                    placeholder="Token de Workers AI (cfut_...)"
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Modelo de Cloudflare Workers AI</label>
                                <select
                                    value={cfModel}
                                    onChange={(e) => setCfModel(e.target.value)}
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] uppercase font-bold tracking-wider rounded-none px-2.5 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all"
                                >
                                    <option value="@cf/black-forest-labs/flux-1-schnell">FLUX.1 Schnell (Veloz/Gratis)</option>
                                    <option value="@cf/leonardo/phoenix-1.0">Leonardo Phoenix 1.0 (Texto Excelente)</option>
                                    <option value="@cf/stabilityai/stable-diffusion-xl-base-1.0">SDXL Base 1.0</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {mockupEngine === 'segmind' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Segmind API Key</label>
                                <input
                                    type="password"
                                    value={segmindKey}
                                    onChange={(e) => setSegmindKey(e.target.value)}
                                    placeholder="SG_..."
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Modelo de Segmind</label>
                                <select
                                    value={segmindModel}
                                    onChange={(e) => setSegmindModel(e.target.value)}
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] uppercase font-bold tracking-wider rounded-none px-2.5 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all"
                                >
                                    <option value="flux-schnell">FLUX.1 Schnell</option>
                                    <option value="flux-dev">FLUX.1 Dev</option>
                                    <option value="sdxl1.0-txt2img">Stable Diffusion XL 1.0</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {mockupEngine === 'nanobanana' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Token de Kie AI (Google Nano Banana)</label>
                                <input
                                    type="password"
                                    value={kieToken}
                                    onChange={(e) => setKieToken(e.target.value)}
                                    placeholder="Bearer token de Kie AI..."
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-3 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all font-mono"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-white/5">
                        <button
                            onClick={handleSaveSettings}
                            className="px-6 py-2 bg-exec-blue text-black hover:bg-blue-400 text-[9px] font-black uppercase tracking-widest rounded-none transition-all flex items-center gap-2"
                        >
                            {settingsSaved ? (
                                <>
                                    <Check size={12} />
                                    AJUSTES GUARDADOS
                                </>
                            ) : (
                                'GUARDAR CONFIGURACIÓN'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Contenedor de Insumos y Parámetros */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel de Insumos Encontrados */}
                <div className="bg-[#050505] border border-exec-border p-5 space-y-4 rounded-none">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-3">Insumos del Periodo</h3>                    <div className="space-y-4">
                        {/* Rango de fechas */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-wider block mb-1">Inicio</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-2.5 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-wider block mb-1">Fin</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-black border border-[#222] text-gray-300 text-[10px] rounded-none px-2.5 py-1.5 focus:outline-none focus:border-exec-blue/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Totales rápidos */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                            <div className="bg-black/40 border border-[#222] p-2 flex flex-col items-center justify-center text-center">
                                <Calendar size={12} className="text-exec-blue mb-1" />
                                <span className="text-[7px] font-black text-gray-500 uppercase tracking-wider">Eventos</span>
                                <span className="text-white text-xs font-black mt-0.5">{events.length}</span>
                            </div>
                            <div className="bg-black/40 border border-[#222] p-2 flex flex-col items-center justify-center text-center">
                                <BookOpen size={12} className="text-[#00D1B2] mb-1" />
                                <span className="text-[7px] font-black text-gray-500 uppercase tracking-wider">Artículos</span>
                                <span className="text-white text-xs font-black mt-0.5">{publications.length}</span>
                            </div>
                            <div className="bg-black/40 border border-[#222] p-2 flex flex-col items-center justify-center text-center">
                                <AlertCircle size={12} className="text-amber-500 mb-1" />
                                <span className="text-[7px] font-black text-gray-500 uppercase tracking-wider">Festivos</span>
                                <span className="text-white text-xs font-black mt-0.5">{holidays.length}</span>
                            </div>
                        </div>

                        {/* Listado de Detalles de Insumos */}
                        <div className="pt-2 border-t border-white/5 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                            {/* Días Festivos */}
                            {holidays.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-amber-500"></span> Días festivos en el rango:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {holidays.map((h, idx) => (
                                            <span 
                                                key={idx} 
                                                className="text-[8px] bg-amber-500/5 text-amber-500 border border-amber-500/10 px-1.5 py-0.5 rounded-none uppercase font-bold" 
                                                title={h.description || 'Festividad'}
                                            >
                                                {h.name} ({String(h.date_day).padStart(2, '0')}/{String(h.date_month).padStart(2, '0')})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Eventos SGR */}
                            {events.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-exec-blue"></span> Eventos académicos:
                                    </p>
                                    <div className="space-y-1">
                                        {events.map((e, idx) => (
                                            <div key={idx} className="text-[9px] bg-black/40 border border-[#222] p-2 rounded-none text-gray-400 font-medium">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-white font-bold">{e.title}</span>
                                                    <span className="text-exec-blue text-[8px] font-black">{e.scheduled_date.split('-').reverse().join('/')}</span>
                                                </div>
                                                {e.description && <p className="text-[8px] text-gray-500 line-clamp-1">{e.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Artículos de la revista */}
                            {publications.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-[#00D1B2]"></span> Artículos de la revista:
                                    </p>
                                    <div className="space-y-1.5">
                                        {publications.map((p, idx) => (
                                            <div key={idx} className="text-[9px] bg-black/40 border border-[#222] p-2.5 rounded-none text-gray-400 font-medium flex flex-col gap-1 hover:border-[#00D1B2]/30 transition-all">
                                                <span className="text-white font-bold line-clamp-2 uppercase tracking-tight leading-snug">{p.title}</span>
                                                <span className="text-[8px] text-gray-500">Autores: {p.authors}</span>
                                                <div className="flex justify-between items-center text-[7px] text-gray-500 mt-0.5">
                                                    <span>{p.volume} - {p.number}</span>
                                                    {p.published_date && <span>{p.published_date}</span>}
                                                </div>
                                                {p.url && (
                                                    <a 
                                                        href={p.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-[8px] text-[#00D1B2] hover:underline font-bold flex items-center gap-1 mt-1 self-start"
                                                    >
                                                        Abrir Artículo en UNC ↗
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel de Configuración de Motor AI */}
                <div className="bg-[#050505] border border-exec-border p-5 space-y-4 rounded-none lg:col-span-2 flex flex-col justify-between">
                    <div>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-3 mb-4">Parámetros de Inteligencia Artificial</h3>
                        <div className="max-w-md">
                            <AIEngineSelector
                                config={aiConfig}
                                onConfigChange={setAiConfig}
                                variant="full"
                            />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-4 leading-relaxed uppercase tracking-wider">
                            <ShieldAlert className="w-3.5 h-3.5 text-exec-blue inline mr-1.5 align-text-bottom" />
                            <strong>Pautas Editoriales:</strong> El orquestador utilizará el manual de marca de la revista ACS para asegurar un tono académico ejecutivo y colores corporativos (azul y blanco) en los mockups.
                        </p>
                    </div>

                    <button
                        onClick={handleGeneratePlan}
                        disabled={generating || loadingInputs}
                        className="w-full mt-6 flex items-center justify-center gap-2.5 px-4 py-3 bg-exec-blue hover:bg-blue-400 text-black text-[10px] font-black uppercase tracking-[0.25em] rounded-none transition-all shadow-lg shadow-exec-blue/10 disabled:opacity-40"
                    >
                        {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {generating ? 'CONSULTANDO AL ORQUESTADOR TÁCTICO...' : 'GENERAR PARRILLA CON IA'}
                    </button>
                </div>
            </div>

            {/* Resultados del Plan de Contenidos o Cargando */}
            {loadingPlan ? (
                <div className="flex flex-col items-center justify-center py-12 bg-[#050505] border border-exec-border p-6 rounded-none space-y-3">
                    <Loader2 className="w-6 h-6 text-exec-blue animate-spin" />
                    <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase animate-pulse">Cargando Plan de Publicaciones Guardado...</span>
                </div>
            ) : plannedPosts.length > 0 ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center border-b border-[#222] pb-3">
                        <h3 className="text-[12px] font-black text-white tracking-widest uppercase flex items-center gap-2">
                            <Calendar className="w-4.5 h-4.5 text-exec-blue" />
                            Parrilla de Publicación Propuesta por la IA ({plannedPosts.length} posts)
                        </h3>
                        <span className="text-[8px] font-black text-exec-blue bg-exec-blue/10 border border-exec-blue/20 px-2 py-0.5 rounded-none uppercase">Plan Semanal/Mensual</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {plannedPosts.map((post, idx) => (
                            <PlannedContentCard
                                key={idx}
                                post={post}
                                users={allProfiles}
                                onTaskCreated={loadInputs}
                                onDelete={() => handleDeletePost(idx)}
                                onUpdatePost={(updatedPost) => {
                                    const updatedPosts = [...plannedPosts];
                                    updatedPosts[idx] = updatedPost;
                                    setPlannedPosts(updatedPosts);
                                    savePlanToSupabase(updatedPosts);
                                }}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
