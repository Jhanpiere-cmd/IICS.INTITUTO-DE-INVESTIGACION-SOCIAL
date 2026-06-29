import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Users, Calendar as CalendarDays, Mic, MessageSquare, Check, Timer, AlertTriangle, 
  Music, Presentation, Gift, Globe, Wrench, MessageCircle, Video, Sparkles, Bell
} from 'lucide-react';
import { PDFPresenter } from './PDFPresenter';

interface ActividadPrograma {
  id: string;
  tipo: string;
  titulo: string;
  responsable: string;
  duracion_minutos: number;
  orden: number;
  estado: 'pendiente' | 'en_vivo' | 'completado';
  presentacion_url?: string;
}

interface EventoEnVivo {
  id: string;
  evento_id: string;
  actividad_actual_id: string;
  tiempo_restante_segundos: number;
  estado_transmision: 'inactivo' | 'en_vivo' | 'pausado' | 'finalizado';
  ultima_actualizacion: string;
  enlace_publico: string;
  programa: ActividadPrograma[];
  cover_image_url?: string;
}

export const LiveEventPublicView: React.FC<{ eventId?: string }> = ({ eventId: propEventId }) => {
  const { eventId: paramId } = useParams<{ eventId: string }>();
  const id = propEventId || paramId;
  
  const [eventoEnVivo, setEventoEnVivo] = useState<EventoEnVivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronometro, setCronometro] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [alertaActiva, setAlertaActiva] = useState<{ tipo: string; mensaje: string } | null>(null);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [notificacion, setNotificacion] = useState<{ mensaje: string | null; id?: number } | null>(null);
  
  // Refs para el motor de tiempo persistente
  const statusRef = useRef<string>('inactivo');
  
  // Sincronizar el Ref con el estado real
  useEffect(() => {
    statusRef.current = eventoEnVivo?.estado_transmision || 'inactivo';
  }, [eventoEnVivo?.estado_transmision]);

  // Refs para el Motor Atómico (Update directo al DOM para fluidez extrema)
  const cronoRef = useRef<number>(0);
  const displayRef = useRef<HTMLDivElement>(null);
  // Para captura de ventana externa (Zoom/Meet) enviada desde el moderador
  const externalVideoRef = useRef<HTMLVideoElement>(null);
  const [hasExternalStream, setHasExternalStream] = useState(false);
  
  useEffect(() => {
    // Sincronización inteligente: Solo actualizamos el DOM desde React si el desfase es significativo (> 2s)
    // Esto evita que el broadcast de red "pise" la fluidez del segundero local.
    if (Math.abs(cronoRef.current - cronometro) > 2) {
      cronoRef.current = cronometro;
      if (displayRef.current) {
        displayRef.current.innerText = formatoTiempo(cronometro);
      }
    }
  }, [cronometro]);

  useEffect(() => {
    const timer = setInterval(() => {
      // Usamos el statusRef para decidir si descontar
      if (statusRef.current === 'en_vivo' && cronoRef.current > 0) {
        cronoRef.current -= 1;
        // Actualizamos el DOM DIRECTAMENTE para 0 latencia visual
        if (displayRef.current) {
          displayRef.current.innerText = formatoTiempo(cronoRef.current);
        }
        // Sincronizamos con React menos frecuentemente para evitar render-storms
        if (cronoRef.current % 2 === 0) {
           setCronometro(cronoRef.current);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Receptor: escucha el stream capturado enviado desde el panel del moderador
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SGR_STREAM_AVAILABLE') {
        // Obtener el stream guardado en el window del moderador (parent/opener)
        const openerStream = (window.opener as any)?.__sgrCapturedStream;
        if (openerStream && externalVideoRef.current) {
          externalVideoRef.current.srcObject = openerStream;
          externalVideoRef.current.play().catch(err => {
            console.error('[Proyector] Error reproduciendo stream externo:', err);
          });
          setHasExternalStream(true);
        }
      } else if (event.data?.type === 'SGR_STREAM_ENDED') {
        if (externalVideoRef.current) {
          externalVideoRef.current.srcObject = null;
        }
        setHasExternalStream(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (!id) return;
    loadEventoEnVivo();
    loadFlyer();
  }, [id]);

  // Gestión de Canal de Tiempo Real con Limpieza Garantizada
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase
      .channel(`evento_${id}`)
      .on('broadcast', { event: 'estado_actualizado' }, (payload) => {
        const data = payload.payload as any;
        setEventoEnVivo(prev => {
           if (!prev) return null;
           // Si hay una actualización de programa, forzamos la actualización completa
           return { ...prev, ...data };
        });
        
        if (data.tiempo_restante_segundos !== undefined) {
           // Si viene de un cambio de estado (adelante/atrás), forzamos sincronización
           cronoRef.current = data.tiempo_restante_segundos;
           setCronometro(data.tiempo_restante_segundos);
           if (displayRef.current) {
             displayRef.current.innerText = formatoTiempo(data.tiempo_restante_segundos);
           }
        }

        if (data.pagina_actual !== undefined) {
          setPaginaActual(data.pagina_actual);
        }

        if (data.estado_transmision) {
          statusRef.current = data.estado_transmision;
        }

        if (data.cover_image_url) setFlyerUrl(data.cover_image_url);
      })
      .on('broadcast', { event: 'tiempo_actualizado' }, (payload) => {
        const servTime = payload.payload.tiempo;
        const sentAt = payload.payload.sent_at;
        const force = payload.payload.force;
        
        // Compensación de Latencia: servTime - (Ahora - SentAt)
        let exactTime = servTime;
        if (sentAt) {
          const latency = Math.max(0, Math.floor((Date.now() - new Date(sentAt).getTime()) / 1000));
          // Si la latencia es sospechosamente alta (> 5s), ignoramos la compensación
          if (latency < 5) {
            exactTime = Math.max(0, servTime - latency);
          }
        }

        // Sincronización Estricta: El proyector corrige si el moderador lo ordena
        // o si hay un desajuste visible (> 1s) para garantizar que el tiempo nunca pare.
        if (force || Math.abs(exactTime - cronoRef.current) > 1) {
           cronoRef.current = exactTime;
           setCronometro(exactTime);
           if (displayRef.current) {
             displayRef.current.innerText = formatoTiempo(exactTime);
           }
        }
      })
      .on('broadcast', { event: 'notificacion_publica' }, (payload) => {
        setNotificacion(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Robusta lógica de autocierre para notificaciones (15s)
  useEffect(() => {
    if (!notificacion?.mensaje) return;

    const timer = setTimeout(() => {
      setNotificacion(null);
    }, 15000);

    return () => clearTimeout(timer);
  }, [notificacion]);

  const loadFlyer = async () => {
    if (!id) return;
    try {
      const { data } = await supabase
        .from('events')
        .select('title, cover_image_url')
        .eq('id', id)
        .single();
      if (data) {
        if (data.cover_image_url) setFlyerUrl(data.cover_image_url);
        if (data.title) setEventTitle(data.title);
      }
    } catch (err) {
      console.error('Error loading flyer:', err);
    }
  };

  const loadEventoEnVivo = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('eventos_en_vivo')
        .select('*')
        .eq('evento_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando evento en vivo:', error);
        return;
      }

      if (data) {
        setEventoEnVivo(data);
        
        let tiempoFinal = data.tiempo_restante_segundos;
        
        // Sincronización de Página (Corrección Crítica)
        if (data.pagina_actual !== undefined) {
          setPaginaActual(data.pagina_actual);
        }
        
        // AUDITORÍA: Compensación de tiempo transcurrido desde el último guardado en DB.
        // La DB se actualiza cada 5 seg, así que compensamos el tiempo que pasó desde entonces.
        // Si el proyector YA tiene un timer corriendo (cronoRef > 0), NO sobreescribimos
        // para evitar saltos de tiempo cuando el moderador recarga su pantalla.
        if (cronoRef.current > 0 && statusRef.current === 'en_vivo') {
          console.log(`[AUDITORÍA Proyector] Timer local activo (${cronoRef.current}s). Recarga de DB ignorada para evitar saltos.`);
          // Solo actualizamos si la diferencia es mayor a 5 segundos (tolerancia de persistencia DB)
          const diff = Math.abs(cronoRef.current - tiempoFinal);
          if (diff > 5) {
            if (data.estado_transmision === 'en_vivo' && data.ultima_actualizacion) {
              const segundosTranscurridos = Math.floor((Date.now() - new Date(data.ultima_actualizacion).getTime()) / 1000);
              tiempoFinal = Math.max(0, data.tiempo_restante_segundos - segundosTranscurridos);
            }
            console.log(`[AUDITORÍA Proyector] Desfase > 5s detectado (${diff}s). Corrigiendo a ${tiempoFinal}s.`);
            cronoRef.current = tiempoFinal;
            setCronometro(tiempoFinal);
            if (displayRef.current) displayRef.current.innerText = formatoTiempo(tiempoFinal);
          }
        } else {
          // Primera carga: compensar tiempo transcurrido desde el último guardado
          if (data.estado_transmision === 'en_vivo' && data.ultima_actualizacion) {
            const segundosTranscurridos = Math.floor((Date.now() - new Date(data.ultima_actualizacion).getTime()) / 1000);
            tiempoFinal = Math.max(0, data.tiempo_restante_segundos - segundosTranscurridos);
            console.log(`[AUDITORÍA Proyector] DB: ${data.tiempo_restante_segundos}s → Ajustado: ${tiempoFinal}s (diferencia: ${segundosTranscurridos}s)`);
          }

          setCronometro(tiempoFinal);
          cronoRef.current = tiempoFinal;
          if (displayRef.current) displayRef.current.innerText = formatoTiempo(tiempoFinal);
        }
      }
    } catch (error) {
      console.error('Error en loadEventoEnVivo:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatoTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getIconoActividad = (tipo: string) => {
    const size = 48;
    switch (tipo) {
      case 'bienvenida': return <Users size={size} />;
      case 'himno': return <CalendarDays size={size} />;
      case 'ponencia': return <Mic size={size} />;
      case 'conferencia': return <Presentation size={size} />;
      case 'panel': return <Users size={size} />;
      case 'musical': return <Music size={size} />;
      case 'taller': return <Wrench size={size} />;
      case 'comentario': return <MessageCircle size={size} />;
      case 'preguntas': return <MessageSquare size={size} />;
      case 'sorteo': return <Gift size={size} />;
      case 'networking': return <Globe size={size} />;
      case 'break': return <Video size={size} />;
      case 'cierre': return <Check size={size} />;
      default: return <Presentation size={size} className="text-blue-400" />;
    }
  };

  const actividadActual = eventoEnVivo?.programa.find(a => a.id === eventoEnVivo.actividad_actual_id);
  const currentIndex = eventoEnVivo?.programa.findIndex(act => act.id === eventoEnVivo.actividad_actual_id) ?? -1;
  const siguienteActividad = currentIndex !== -1 ? eventoEnVivo?.programa[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-full border-4 border-blue-900 border-t-blue-500 animate-spin"></div>
          <p className="text-xs uppercase tracking-[0.5em] text-blue-500 font-bold animate-pulse">Iniciando Experiencia Proyector</p>
        </div>
      </div>
    );
  }

  if (!eventoEnVivo || eventoEnVivo.estado_transmision === 'inactivo') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
        {flyerUrl && (
          <div className="absolute inset-0 z-0">
             <img src={flyerUrl} className="w-full h-full object-cover opacity-20 blur-xl scale-110" alt="" />
             <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
          </div>
        )}
        <div className="relative z-10 text-center max-w-2xl px-8">
           <div className="mb-12 inline-block">
             <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center mb-6 mx-auto backdrop-blur-md">
               <Timer size={48} className="text-blue-500 animate-pulse" />
             </div>
             <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.4em] mb-4">SGR-ACS LIVE</p>
           </div>
           <h1 className="text-6xl font-light text-white mb-8 tracking-tighter leading-none">
             El evento comenzará en breve
           </h1>
           <p className="text-xl text-gray-400 font-medium leading-relaxed opacity-60">
             Estamos preparando todo para brindarte la mejor experiencia. 
             Por favor, toma asiento y mantente atento a la pantalla.
           </p>
        </div>
        <div className="absolute bottom-12 left-0 right-0 text-center">
           <p className="text-[10px] font-bold text-gray-700 uppercase tracking-[0.6em]">SISTEMA DE GESTIÓN ACS • MODO ESPERA</p>
        </div>
      </div>
    );
  }

  const isImage = (url?: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || 
           cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || 
           cleanUrl.endsWith('.gif');
  };

  const isYoutube = (url?: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isPDF = (url?: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.pdf') || url.includes('/storage/v1/object/public/');
  };

  const getIframeUrl = () => {
    if (!actividadActual?.presentacion_url) return '';
    let url = actividadActual.presentacion_url;
    
    // Soporte para Google Drive
    if (url.includes('drive.google.com') && !url.includes('/preview')) {
      url = url.replace('/view', '/preview');
    }

    // Soporte para PowerPoint vía Microsoft Office Viewer
    const isPPT = url.toLowerCase().endsWith('.ppt') || 
                  url.toLowerCase().endsWith('.pptx') || 
                  url.includes('format=pptx') || 
                  url.includes('format=ppt');

    if (isPPT) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }

    // Soporte para YouTube
    if (isYoutube(url)) {
      let videoId = '';
      if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
      else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
      else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1` : url;
    }

    // Soporte para PDF
    if (url.toLowerCase().includes('.pdf')) {
      return `${url}#page=${paginaActual}`;
    }

    return url;
  };

  // Helper for adaptive font size based on text length
  const getAdaptiveFontSize = (text: string, type: 'event' | 'current' | 'next') => {
    const len = text.length;
    if (type === 'event') {
      if (len > 80) return "text-sm xl:text-base";
      if (len > 40) return "text-base xl:text-lg";
      return "text-lg xl:text-xl";
    }
    if (type === 'current') {
      if (len > 150) return "text-lg xl:text-xl";
      if (len > 80) return "text-xl xl:text-2xl";
      return "text-2xl xl:text-3xl";
    }
    if (type === 'next') {
      if (len > 120) return "text-xs xl:text-sm";
      if (len > 60) return "text-sm xl:text-base";
      return "text-base";
    }
    return "";
  };

  return (
    <div className="h-screen bg-[#050505] text-white font-sans antialiased relative overflow-hidden flex flex-col">
      
      {/* Cinematic Ambient Layer */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]"></div>
      </div>

      {/* Header - Minimal & Executive */}
      <header className="relative z-20 h-16 flex items-center justify-between px-10 border-b border-white/5 backdrop-blur-md bg-black/40 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 flex items-center justify-center">
             <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Logo ACS" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-black tracking-[0.4em] uppercase text-white leading-none mb-1">
               SGR-ACS
            </h1>
            <p className="text-[8px] font-bold text-blue-500 tracking-[0.5em] uppercase">Alternativas en Ciencias Sociales</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col text-right">
              <div className="flex items-center gap-3 justify-end">
                 <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mr-2">Conectando Ideas</p>
                 <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse ${
                    eventoEnVivo?.estado_transmision === 'en_vivo' ? 'bg-green-500' : 'bg-gray-500'
                 }`}></div>
                 <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                    {eventoEnVivo?.estado_transmision === 'en_vivo' ? 'En Vivo' : 
                     eventoEnVivo?.estado_transmision === 'pausado' ? 'Pausado' : 'Esperando'}
                 </span>
              </div>
           </div>
        </div>
      </header>

      {/* Main Experience Layout - Side by Side */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Section: Multimedia Viewport / Flyer Fallback */}
        <div className="flex-[1.2] lg:flex-[1.4] relative bg-black flex items-center justify-center border-r border-white/5 overflow-hidden">
           {actividadActual?.presentacion_url ? (
             <div className="w-full h-full relative group bg-black flex items-center justify-center">
                {isImage(actividadActual.presentacion_url) ? (
                   <img 
                     src={actividadActual.presentacion_url} 
                     className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-700" 
                     alt="Recurso Visual" 
                   />
                ) : isPDF(actividadActual.presentacion_url) ? (
                   <PDFPresenter 
                     url={actividadActual.presentacion_url} 
                     pageNumber={paginaActual} 
                     className="w-full h-full"
                   />
                ) : (
                   <iframe 
                     key={actividadActual.id} 
                     src={getIframeUrl()}
                     className="w-full h-full border-0"
                     allow="autoplay; encrypted-media"
                     title="Presentación"
                     loading="eager"
                   />
                )}
                
                {/* Overlay contextual para el proyector */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm pointer-events-none group-hover:opacity-0 transition-opacity">
                   <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1">Recurso en Vivo</p>
                   <p className="text-sm font-bold text-white uppercase truncate max-w-xs">{actividadActual.responsable || 'SGR System'}</p>
                </div>
             </div>
           ) : flyerUrl ? (
             <div className="relative w-full h-full flex items-center justify-center p-8">
                <img 
                  src={flyerUrl} 
                  className="max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-sm" 
                  alt="Event Flyer" 
                />
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]"></div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-4 text-white/10">
                <CalendarDays size={120} strokeWidth={1} />
                <p className="text-sm uppercase tracking-[0.5em]">Flyer no disponible</p>
             </div>
           )}
        </div>

        {/* Right Section: Focus Info */}
        <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-3xl overflow-hidden">
           
           {/* Alerts Overlay inside Right Section */}
           {alertaActiva && (
             <div className="p-6 animate-in fade-in slide-in-from-top-4 duration-500 flex-shrink-0">
                <div className={`p-4 rounded-sm border-l-4 ${
                   alertaActiva.tipo === 'warning' ? 'bg-red-500/10 border-red-500' : 'bg-amber-500/10 border-amber-500'
                }`}>
                   <div className="flex items-center gap-4">
                      <AlertTriangle className={alertaActiva.tipo === 'warning' ? 'text-red-500' : 'text-amber-500'} />
                      <p className="text-lg font-bold uppercase tracking-tight">{alertaActiva.mensaje}</p>
                   </div>
                </div>
             </div>
           )}

           <div className="flex-1 p-4 xl:p-6 space-y-2 xl:space-y-4 flex flex-col justify-between overflow-hidden">
              
              {/* Timer Section - Event Title Above Numbers */}
              <div className="space-y-1">
                 <p className={`font-black text-blue-500 uppercase tracking-[0.2em] ${getAdaptiveFontSize(eventTitle, 'event')}`}>
                    {eventTitle}
                 </p>
                 <div 
                    ref={displayRef}
                    className="text-[4.5rem] xl:text-[6rem] font-light text-white tabular-nums tracking-tighter leading-none -ml-1"
                 >
                    {formatoTiempo(cronometro)}
                 </div>
                 <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.6em]">Tiempo de Actividad</p>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent flex-shrink-0"></div>

              {/* Current Activity */}
              {actividadActual ? (
                <div className="space-y-3">
                   <div className="space-y-1">
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.5em]">Actividad Actual</p>
                      <h2 className={`font-black text-white uppercase leading-tight tracking-tighter break-words ${getAdaptiveFontSize(actividadActual.titulo, 'current')}`}>
                         {actividadActual.titulo}
                      </h2>
                   </div>
                   
                   <div className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-sm">
                      <div className="p-2 bg-white text-black rounded-sm flex-shrink-0">
                        {getIconoActividad(actividadActual.tipo)}
                      </div>
                      <div className="overflow-hidden">
                         <p className="text-[8px] font-bold text-blue-500 uppercase tracking-[0.4em] mb-0.5">Responsable</p>
                         <p className="text-lg xl:text-xl font-light text-white tracking-tight leading-tight">{actividadActual.responsable || 'SGR Protocol'}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <p className="text-xl font-thin text-white/20 italic tracking-widest uppercase">Sincronizando...</p>
              )}
              {/* Next Activity - More Compact */}
              {siguienteActividad && (
                 <div className="pt-4 mt-auto mb-12">
                   <div className="p-4 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-sm relative">
                      <p className="text-[8px] font-bold text-blue-400 uppercase tracking-[0.4em] mb-2">A continuación</p>
                      <h4 className={`font-bold text-white uppercase tracking-tight ${getAdaptiveFontSize(siguienteActividad.titulo, 'next')}`}>{siguienteActividad.titulo}</h4>
                      <p className="text-[9px] text-white/40 font-medium uppercase tracking-[0.2em] mt-1">
                         Duración: {siguienteActividad.duracion_minutos} min.
                      </p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </main>

      {/* Corporate Footer Bar */}
      <footer className="relative z-20 h-14 bg-black border-t border-white/5 px-10 flex items-center justify-between flex-shrink-0">
         <div className="flex items-center gap-8">
            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.3em]">
               Universidad Nacional de Cajamarca • Ciencias Sociales
            </p>
         </div>
         <div className="text-right flex items-center gap-6">
            <p className="text-[9px] text-blue-500 font-mono font-bold tracking-widest">{new Date().toLocaleTimeString()}</p>
         </div>
      </footer>

      {/* Progress Line - Top of screen */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-white/5 z-50 overflow-hidden">
         <div 
          className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] transition-all duration-1000 ease-linear"
          style={{ 
            width: actividadActual && actividadActual.duracion_minutos > 0 ? `${(cronometro / (actividadActual.duracion_minutos * 60)) * 100}%` : '0%' 
          }}
         ></div>
      </div>

      {notificacion?.mensaje && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="bg-black/80 backdrop-blur-3xl border-2 border-blue-500/50 rounded-sm p-8 shadow-[0_0_60px_rgba(37,99,235,0.3)] relative overflow-hidden group">
            {/* Glossy shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-transparent opacity-30"></div>
            
            <div className="relative z-10 flex items-center gap-8">
              <div className="flex-shrink-0 w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-sm flex items-center justify-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                <MessageSquare size={40} className="text-blue-500 relative z-10" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                   <div className="h-[1px] w-8 bg-blue-500/50"></div>
                   <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-500">Comunicado Oficial</span>
                   <div className="h-[1px] flex-1 bg-white/5"></div>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight leading-tight uppercase">
                  {notificacion.mensaje}
                </h2>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center mb-2">
                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                </div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">SGR-ACS LIVE</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de stream externo desde ventana capturada por el moderador (Zoom/Meet/Teams) */}
      {hasExternalStream && (
        <div className="absolute inset-0 z-[80] bg-black animate-in fade-in duration-500">
          <video
            ref={externalVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          {/* Badge indicador */}
          <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-xl border border-green-500/30 px-4 py-2 rounded-sm pointer-events-none flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Captura en Vivo</p>
          </div>
        </div>
      )}
    </div>
  );
};
