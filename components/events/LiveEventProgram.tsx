import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  Play,
  Pause,
  SkipForward,
  Plus,
  Square,
  Timer,
  Radio,
  List,
  Settings,
  Mic,
  MessageSquare,
  Check,
  Users,
  Share2,
  ExternalLink,
  Edit,
  Music,
  Users2,
  Presentation,
  Gift,
  Globe,
  Wrench,
  MessageCircle,
  Video,
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  Monitor,
  VolumeX,
  Send,
  MapPin
} from 'lucide-react';
import { ProgramCreator } from './ProgramCreator';
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
  pagina_actual?: number;
}

interface LiveEventProgramProps {
  eventId: string;
  userRole?: string;
  onClose?: () => void;
}

export const LiveEventProgram: React.FC<LiveEventProgramProps> = ({ eventId, userRole, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [eventoEnVivo, setEventoEnVivo] = useState<EventoEnVivo | null>(null);
  const [eventoFull, setEventoFull] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cronometro, setCronometro] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showProgramEditor, setShowProgramEditor] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [mensajeIntercom, setMensajeIntercom] = useState('');
  const isProcessingNext = React.useRef(false);
  // AUDITORÍA: Ref interno para el cronómetro del moderador, evita closures stale
  // y garantiza que el timer NUNCA lea un valor reiniciado por recarga de datos.
  const cronoRef = React.useRef(0);

  // Estado de transmisión y presentación
  const [fbStreamKey, setFbStreamKey] = useState('FB-1401468045070045-0-Ab7e1yOQfppX9zToZwlkEYly');
  const [panelTab, setPanelTab] = useState<'presentar' | 'fb'>('presentar');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);
  const fbPreviewRef = useRef<HTMLVideoElement>(null);
  // Ref del popup del proyector para enviarle el stream capturado
  const projectorWindowRef = React.useRef<Window | null>(null);

  // Canal persistente de broadcast para latencia cero
  const broadcastChannel = React.useMemo(() => supabase.channel(`evento_${eventId}`), [eventId]);
  const statusRef = React.useRef(eventoEnVivo?.estado_transmision || 'inactivo');

  React.useEffect(() => {
    statusRef.current = eventoEnVivo?.estado_transmision || 'inactivo';
  }, [eventoEnVivo?.estado_transmision]);

  React.useEffect(() => {
    const channel = broadcastChannel
      .on('broadcast', { event: 'estado_actualizado' }, (payload) => {
        const data = payload.payload as any;
        setEventoEnVivo(prev => prev ? { ...prev, ...data } : null);
        if (data.tiempo_restante_segundos !== undefined) {
          setCronometro(data.tiempo_restante_segundos);
          cronoRef.current = data.tiempo_restante_segundos;
        }
        if (data.estado_transmision !== undefined) setIsPlaying(data.estado_transmision === 'en_vivo');
        if (data.pagina_actual !== undefined) setPaginaActual(data.pagina_actual);
      })
      // Eliminamos el listener de 'tiempo_actualizado' para el Moderador.
      // Como el Moderador es la fuente de verdad, no debe sincronizarse con su propio broadcast de tiempo
      // para evitar saltos por latencia de red.
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [broadcastChannel]);

  // Cargar datos del evento en vivo y metadatos del evento principal
  useEffect(() => {
    loadEventoEnVivo();
    loadEventoFull();
  }, [eventId]);

  const loadEventoFull = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_participants(count)')
        .eq('id', eventId)
        .single();
      if (data) setEventoFull(data);
    } catch (err) {
      console.error('Error loading event metadata:', err);
    }
  };

  const loadEventoEnVivo = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos_en_vivo')
        .select('*')
        .eq('evento_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando evento en vivo:', error);
        return;
      }

      // AUDITORÍA: Si no existe el registro, crearlo
      if (!data) {
        await crearEventoEnVivo();
        return;
      }
        // Sincronización Dinámica de Enlace (Local vs Netlify)
        if (data.enlace_publico && !data.enlace_publico.startsWith(window.location.origin)) {
          const newLink = `${window.location.origin}/evento/${eventId}/vivo`;
          await supabase.from('eventos_en_vivo').update({ enlace_publico: newLink }).eq('id', data.id);
          data.enlace_publico = newLink;
        }

        setEventoEnVivo(data);
        
        // AUDITORÍA DINÁMICA: Reconstrucción de tiempo transcurrido
        const tiempoDB = data.tiempo_restante_segundos;
        let tiempoFinal = tiempoDB;
        let actividadActualId = data.actividad_actual_id;
        let programaActualizado = [...data.programa];
        let cambioDetectado = false;

        if (data.estado_transmision === 'en_vivo' && data.ultima_actualizacion) {
          const ahora = new Date().getTime();
          const ultimaVez = new Date(data.ultima_actualizacion).getTime();
          let segundosPerdidos = Math.floor((ahora - ultimaVez) / 1000);

          // AUDITORÍA: Solo reconstruimos si NO estamos ya reproduciendo localmente (evitar saltos)
          if (segundosPerdidos > 0 && !isPlaying) {
            console.log(`[AUDITORÍA] Detectados ${segundosPerdidos}s de inactividad del panel. Reconstruyendo estado...`);
            
            let tiempoRestanteEnActividad = tiempoDB - segundosPerdidos;
            let currentIndex = programaActualizado.findIndex(a => a.id === actividadActualId);

            // Lógica de Salto Transversal de Actividades
            while (tiempoRestanteEnActividad <= 0 && currentIndex !== -1 && currentIndex < programaActualizado.length - 1) {
                console.log(`[AUDITORÍA] Actividad ${programaActualizado[currentIndex].titulo} expiró en ausencia. Saltando a la siguiente.`);
                programaActualizado[currentIndex].estado = 'completado';
                currentIndex++;
                actividadActualId = programaActualizado[currentIndex].id;
                programaActualizado[currentIndex].estado = 'en_vivo';
                tiempoRestanteEnActividad += (programaActualizado[currentIndex].duracion_minutos * 60);
                cambioDetectado = true;
            }

            tiempoFinal = Math.max(0, tiempoRestanteEnActividad);
            if (Math.abs(tiempoFinal - tiempoDB) > 2) cambioDetectado = true;
          }
        } else if (data.estado_transmision === 'inactivo' && tiempoDB === 0 && data.programa?.length > 0) {
            // Caso inicial: Mostrar tiempo de la primera actividad
            tiempoFinal = data.programa[0].duracion_minutos * 60;
        }

        // AUDITORÍA: Solo sincronizar tiempo y estado si el moderador no está activamente controlando el tiempo
        if (!isPlaying) {
            setCronometro(tiempoFinal);
            cronoRef.current = tiempoFinal;
            setIsPlaying(data.estado_transmision === 'en_vivo');
        }
        
        setPaginaActual(data.pagina_actual || 1);
        
        const nuevoEventoData = { 
            ...data, 
            tiempo_restante_segundos: isPlaying ? cronoRef.current : tiempoFinal, 
            actividad_actual_id: actividadActualId,
            programa: programaActualizado
        };
        setEventoEnVivo(nuevoEventoData);

        // Si hubo reconstrucción y no estábamos activos, persistir
        if (cambioDetectado && !isPlaying) {
          console.log(`[AUDITORÍA] Persistiendo reconstrucción de tiempo: ${tiempoFinal}s`);
          supabase.from('eventos_en_vivo').update({
            tiempo_restante_segundos: tiempoFinal,
            actividad_actual_id: actividadActualId,
            programa: programaActualizado,
            ultima_actualizacion: new Date().toISOString()
          }).eq('id', data.id).then();
        }
    } catch (error) {
      console.error('Error en loadEventoEnVivo:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearEventoEnVivo = async () => {
    try {
      const enlacePublico = `${window.location.origin}/evento/${eventId}/vivo`;
      
      const { data, error } = await supabase
        .from('eventos_en_vivo')
        .insert({
          evento_id: eventId,
          actividad_actual_id: '',
          tiempo_restante_segundos: 0,
          estado_transmision: 'inactivo',
          enlace_publico: enlacePublico,
          programa: [],
          pagina_actual: 1
        })
        .select()
        .single();

      if (error) throw error;
      
      setEventoEnVivo(data);
    } catch (error) {
      console.error('Error creando evento en vivo:', error);
    }
  };

  const cambiarPagina = async (delta: number) => {
    if (!eventoEnVivo) return;
    const nuevaPagina = Math.max(1, paginaActual + delta);
    
    try {
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({ pagina_actual: nuevaPagina })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      setPaginaActual(nuevaPagina);
      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: { pagina_actual: nuevaPagina }
      });
    } catch (err) {
      console.error('Error cambiando página:', err);
    }
  };

  const iniciarEvento = async () => {
    if (!eventoEnVivo?.programa || eventoEnVivo.programa.length === 0) {
      alert('Debe configurar el programa antes de iniciar');
      return;
    }

    try {
      const tiempoInicial = (eventoEnVivo.programa[0].duracion_minutos || 5) * 60;
      
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          actividad_actual_id: eventoEnVivo.programa[0].id,
          tiempo_restante_segundos: tiempoInicial,
          estado_transmision: 'en_vivo',
          pagina_actual: 1,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: {
          actividad_actual_id: eventoEnVivo.programa[0].id,
          tiempo_restante_segundos: tiempoInicial,
          estado_transmision: 'en_vivo',
          pagina_actual: 1,
          cover_image_url: eventoFull?.cover_image_url,
          presentacion_url: eventoEnVivo.programa[0].presentacion_url
        }
      });

      // AUDITORÍA: Sincronizamos el ref al iniciar para que el timer arranque desde el valor correcto
      cronoRef.current = tiempoInicial;
      setCronometro(tiempoInicial);
      setIsPlaying(true);
      setPaginaActual(1);
      setEventoEnVivo({
        ...eventoEnVivo,
        estado_transmision: 'en_vivo',
        actividad_actual_id: eventoEnVivo.programa[0].id,
        tiempo_restante_segundos: tiempoInicial
      });
    } catch (error) {
      console.error('Error iniciando evento:', error);
    }
  };

  const siguienteActividad = async () => {
    if (!eventoEnVivo || isProcessingNext.current) return;
    
    try {
      isProcessingNext.current = true;
      const currentIndex = eventoEnVivo.programa.findIndex(a => a.id.toString() === eventoEnVivo.actividad_actual_id?.toString());
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= eventoEnVivo.programa.length) {
        await finalizarEvento();
        return;
      }

      const nextAct = eventoEnVivo.programa[nextIndex];
      
      const programaActualizado = eventoEnVivo.programa.map((act, index) => ({
        ...act,
        estado: index < nextIndex ? 'completado' : index === nextIndex ? 'en_vivo' : 'pendiente'
      }));

      // Actualización Atómica para evitar bugs de navegación
      console.log(`LOG: Cambiando a actividad ${nextAct.titulo}`);
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          actividad_actual_id: nextAct.id,
          tiempo_restante_segundos: nextAct.duracion_minutos * 60,
          pagina_actual: 1,
          programa: programaActualizado,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: {
          actividad_actual_id: nextAct.id,
          tiempo_restante_segundos: nextAct.duracion_minutos * 60,
          programa: programaActualizado,
          pagina_actual: 1,
          cover_image_url: eventoFull?.cover_image_url,
          presentacion_url: nextAct.presentacion_url,
          force: true // Forzamos sincronización en proyector
        }
      });

      setPaginaActual(1);
      setEventoEnVivo(prev => prev ? { 
        ...prev, 
        actividad_actual_id: nextAct.id,
        tiempo_restante_segundos: nextAct.duracion_minutos * 60,
        programa: programaActualizado
      } : null);
      // AUDITORÍA: Actualizamos el ref antes del estado para que el timer lea el nuevo valor inmediatamente
      cronoRef.current = nextAct.duracion_minutos * 60;
      setCronometro(nextAct.duracion_minutos * 60);

    } catch (error) {
      console.error('Error cambiando de actividad:', error);
      alert('Error al cambiar de actividad. Reintentando...');
    } finally {
      // Liberación garantizada del bloqueo tras un pequeño delay para estabilidad de red
      setTimeout(() => {
        isProcessingNext.current = false;
      }, 800);
    }
  };

  const anteriorActividad = async () => {
    if (!eventoEnVivo || isProcessingNext.current) return;

    try {
      isProcessingNext.current = true;
      const currentIndex = eventoEnVivo.programa.findIndex(a => a.id.toString() === eventoEnVivo.actividad_actual_id?.toString());
      const prevIndex = currentIndex - 1;
      
      if (prevIndex < 0) return;

      const prevActividad = eventoEnVivo.programa[prevIndex];
      
      const programaActualizado = eventoEnVivo.programa.map((act, index) => ({
        ...act,
        estado: index < prevIndex ? 'completado' : index === prevIndex ? 'en_vivo' : 'pendiente'
      }));

      // Actualización Atómica para retroceso
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          actividad_actual_id: prevActividad.id,
          tiempo_restante_segundos: prevActividad.duracion_minutos * 60,
          programa: programaActualizado,
          pagina_actual: 1,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: {
          actividad_actual_id: prevActividad.id,
          tiempo_restante_segundos: prevActividad.duracion_minutos * 60,
          programa: programaActualizado,
          pagina_actual: 1,
          cover_image_url: eventoFull?.cover_image_url,
          presentacion_url: prevActividad.presentacion_url,
          force: true
        }
      });

      setPaginaActual(1);
      setEventoEnVivo(prev => prev ? { 
        ...prev, 
        actividad_actual_id: prevActividad.id,
        tiempo_restante_segundos: prevActividad.duracion_minutos * 60,
        programa: programaActualizado 
      } : null);
      // AUDITORÍA: Sincronizar ref al retroceder actividad
      cronoRef.current = prevActividad.duracion_minutos * 60;
      setCronometro(prevActividad.duracion_minutos * 60);

    } catch (error) {
      console.error('Error retrocediendo actividad:', error);
    } finally {
      setTimeout(() => {
        isProcessingNext.current = false;
      }, 800);
    }
  };

  const togglePause = async () => {
    if (!eventoEnVivo) return;
    const nuevoEstado = !isPlaying ? 'en_vivo' : 'pausado';
    
    try {
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          estado_transmision: nuevoEstado,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: { 
          estado_transmision: nuevoEstado,
          tiempo_restante_segundos: cronometro 
        }
      });

      setIsPlaying(!isPlaying);
      setEventoEnVivo(prev => prev ? { ...prev, estado_transmision: nuevoEstado } : null);
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  };

  const agregarTiempo = async (minutos: number) => {
    if (!eventoEnVivo) return;

    // AUDITORÍA: Usamos el ref como fuente de verdad para evitar closures stale
    const nuevoTiempo = cronoRef.current + (minutos * 60);
    
    try {
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          tiempo_restante_segundos: nuevoTiempo,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      // AUDITORÍA: Actualizamos ref Y estado para garantizar consistencia
      cronoRef.current = nuevoTiempo;
      setCronometro(nuevoTiempo);
      setEventoEnVivo(prev => prev ? { ...prev, tiempo_restante_segundos: nuevoTiempo } : null);
      if (!isPlaying && nuevoTiempo > 0) setIsPlaying(true);

      broadcastChannel.send({
        type: 'broadcast',
        event: 'tiempo_actualizado',
        payload: { tiempo: nuevoTiempo, force: true }
      });
    } catch (error) {
      console.error('Error agregando tiempo:', error);
    }
  };

  const finalizarEvento = async () => {
    if (!eventoEnVivo) return;

    try {
      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          estado_transmision: 'finalizado',
          tiempo_restante_segundos: 0,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: {
          estado_transmision: 'finalizado',
          tiempo_restante_segundos: 0
        }
      });

      setIsPlaying(false);
    } catch (error) {
      console.error('Error finalizando evento:', error);
    }
  };

  // AUDITORÍA: El timer del moderador ahora usa cronoRef (no el estado React) como fuente de verdad.
  // Esto elimina el bug donde una recarga de datos de la DB reiniciaba o aumentaba el cronómetro.
  // El ref es inmune a los re-renders y solo se actualiza cuando el moderador lo controla explícitamente.
  useEffect(() => {
    // AUDITORÍA: Solo iniciamos el timer si isPlaying es true.
    // Removemos eventoEnVivo?.id de las dependencias porque su cambio NO debe reiniciar el timer.
    if (!isPlaying) return;
    
    // Si por alguna razón el ref está en 0 pero acabamos de arrancar, inicializarlo desde el estado
    if (cronoRef.current <= 0 && cronometro > 0) {
      cronoRef.current = cronometro;
    }

    const eventoId = eventoEnVivo?.id;

    const timer = setInterval(() => {
      // AUDITORÍA: Operamos directamente sobre el ref, NO sobre el estado React
      if (cronoRef.current <= 0) {
        clearInterval(timer);
        return;
      }
      
      if (!isProcessingNext.current) {
        cronoRef.current = Math.max(0, cronoRef.current - 1);
        const nuevoTiempo = cronoRef.current;

        // Actualizamos el estado React para que el UI refleje el cambio
        setCronometro(nuevoTiempo);
        
        // Broadcast del tiempo al proyector
        broadcastChannel.send({
          type: 'broadcast',
          event: 'tiempo_actualizado',
          payload: { 
            tiempo: nuevoTiempo,
            sent_at: new Date().toISOString()
          }
        });

        // Persistencia en DB cada 5 segundos
        if (nuevoTiempo % 5 === 0 && eventoId) {
          supabase
            .from('eventos_en_vivo')
            .update({
              tiempo_restante_segundos: nuevoTiempo,
              ultima_actualizacion: new Date().toISOString()
            })
            .eq('id', eventoId)
            .then();
        }

        if (nuevoTiempo === 120) { 
          broadcastChannel.send({
            type: 'broadcast',
            event: 'alerta_activada',
            payload: { tipo: 'warning', mensaje: '⚠️ QUEDAN 2 MINUTOS' }
          });
        }

        if (nuevoTiempo <= 0) {
          clearInterval(timer);
          // AUDITORÍA: El tiempo NO se detiene. Switcheamos a la siguiente actividad.
          if (statusRef.current === 'en_vivo') {
            console.log('[AUDITORÍA] Ciclo terminado. Avanzando automáticamente...');
            siguienteActividad();
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
    // AUDITORÍA: Solo [isPlaying] como dependencia. El timer NO debe reiniciarse por cambios
    // de eventoEnVivo?.id o cronometro, ya que el ref es la fuente de verdad del tiempo.
  }, [isPlaying]);

  // BUG FIX: El srcObject del video debe asignarse después de que React renderice el elemento.
  // Si lo asignamos dentro de iniciarCapturaPantalla, el ref aun es null (el video no existe).
  // Este useEffect se ejecuta DESPUES de cada render, cuando isCapturing=true y el video ya existe.
  useEffect(() => {
    if (captureStream && fbPreviewRef.current && isCapturing) {
      fbPreviewRef.current.srcObject = captureStream;
      fbPreviewRef.current.play().catch(() => {});
    }
  }, [captureStream, isCapturing]);

  const formatoTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getIconoActividad = (tipo: string) => {
    const size = 16;
    switch (tipo) {
      case 'bienvenida': return <Users size={size} />;
      case 'himno': return <CalendarDays size={size} />;
      case 'ponencia': return <Mic size={size} />;
      case 'conferencia': return <Presentation size={size} />;
      case 'panel': return <Users2 size={size} />;
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

  const reiniciarEvento = async () => {
    if (!eventoEnVivo || !confirm('¿Estás seguro de que deseas reiniciar el evento? Esto pondrá la primera actividad como actual y reiniciará el programa.')) return;
    
    try {
      const programaInicial = eventoEnVivo.programa.map((act, index) => ({
        ...act,
        estado: index === 0 ? 'en_vivo' : 'pendiente'
      }));

      const { error } = await supabase
        .from('eventos_en_vivo')
        .update({
          actividad_actual_id: eventoEnVivo.programa[0].id,
          tiempo_restante_segundos: eventoEnVivo.programa[0].duracion_minutos * 60,
          estado_transmision: 'en_vivo',
          pagina_actual: 1,
          programa: programaInicial,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', eventoEnVivo.id);

      if (error) throw error;

      broadcastChannel.send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: {
          actividad_actual_id: eventoEnVivo.programa[0].id,
          tiempo_restante_segundos: eventoEnVivo.programa[0].duracion_minutos * 60,
          estado_transmision: 'en_vivo',
          pagina_actual: 1,
          programa: programaInicial,
          presentacion_url: eventoEnVivo.programa[0].presentacion_url
        }
      });

      setEventoEnVivo(prev => prev ? { ...prev, programa: programaInicial, actividad_actual_id: eventoEnVivo.programa[0].id } : null);
      // AUDITORÍA: Sincronizar ref al reiniciar el evento
      cronoRef.current = eventoEnVivo.programa[0].duracion_minutos * 60;
      setCronometro(eventoEnVivo.programa[0].duracion_minutos * 60);
      setIsPlaying(true);
      setPaginaActual(1);
      
    } catch (error) {
      console.error('Error reiniciando evento:', error);
    }
  };
  
  const enviarNotificacion = (mensaje: string = mensajeIntercom) => {
    if (!mensaje.trim()) return;
    
    broadcastChannel.send({
      type: 'broadcast',
      event: 'notificacion_publica',
      payload: { 
        mensaje: mensaje.toUpperCase(), 
        tipo: 'info',
        id: Date.now() 
      }
    });

    setMensajeIntercom('');
  };

  const limpiarNotificacion = () => {
    broadcastChannel.send({
      type: 'broadcast',
      event: 'notificacion_publica',
      payload: { mensaje: null }
    });
  };

  // Abre el proyector en popup y guarda referencia para enviarle el stream
  const abrirProyectorConRef = () => {
    const url = eventoEnVivo?.enlace_publico;
    if (url) {
      projectorWindowRef.current = window.open(
        url, 'SGR_Projector',
        'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
      );
    }
  };

  // Captura cualquier ventana (Zoom/Meet/Teams) con audio y la envía al proyector
  const iniciarCapturaPantalla = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: 1920, height: 1080 },
        audio: { echoCancellation: false, noiseSuppression: false }
      });
      setCaptureStream(stream);
      setIsCapturing(true);
      // NO asignamos srcObject aquí — el video aun no está renderizado.
      // El useEffect de [captureStream, isCapturing] lo hace después del render.
      // Guardar stream en window para que el proyector popup pueda accederlo
      (window as any).__sgrCapturedStream = stream;
      // Notificar al proyector si ya está abierto como popup
      if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
        projectorWindowRef.current.postMessage(
          { type: 'SGR_STREAM_AVAILABLE' },
          window.location.origin
        );
      }
      // Auto-detener cuando el usuario deja de compartir
      stream.getTracks().forEach(track => {
        track.onended = () => detenerCaptura();
      });
    } catch (err) {
      if ((err as any)?.name !== 'AbortError' && (err as any)?.name !== 'NotAllowedError') {
        console.error('Error capturando pantalla:', err);
      }
    }
  };

  const detenerCaptura = () => {
    if (captureStream) {
      captureStream.getTracks().forEach(track => track.stop());
      setCaptureStream(null);
    }
    setIsCapturing(false);
    if (fbPreviewRef.current) {
      fbPreviewRef.current.srcObject = null;
    }
    // Notificar al proyector que el stream terminó
    (window as any).__sgrCapturedStream = null;
    if (projectorWindowRef.current && !projectorWindowRef.current.closed) {
      projectorWindowRef.current.postMessage(
        { type: 'SGR_STREAM_ENDED' },
        window.location.origin
      );
    }
  };

  const guardarStreamKey = async () => {
    if (!eventoEnVivo) return;
    try {
      await supabase
        .from('eventos_en_vivo')
        .update({ fb_stream_key: fbStreamKey })
        .eq('id', eventoEnVivo.id);
    } catch (err) {
      console.error('Error saving FB stream key:', err);
    }
  };

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
  };

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

  const getIframeUrl = (baseUrl: string) => {
    if (!baseUrl) return '';
    let url = baseUrl;
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

    if (url.toLowerCase().endsWith('.pdf') || url.includes('/storage/v1/object/public/')) {
        // Solo añadimos fragmento de página si NO es PPTX
        return `${url}#page=${paginaActual}`;
    }

    // Soporte para YouTube
    if (isYoutube(url)) {
      let videoId = '';
      if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
      else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
      else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1` : url;
    }

    // Soporte para PDF con fragmentos de página
    if (url.toLowerCase().includes('.pdf') || url.includes('/storage/v1/object/public/')) {
      return `${url}#page=${paginaActual}`;
    }

    return url;
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin"></div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Cargando Panel de Control...</p>
        </div>
      </div>
    );
  }

  const currentAct = eventoEnVivo?.programa.find(a => a.id === eventoEnVivo.actividad_actual_id);

  return (
    <div 
      className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden animate-in fade-in duration-500"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="h-20 bg-[#050505] border-b border-white/5 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-sm border border-white/5 text-gray-500 hover:text-white transition-all group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight uppercase">SGR • Panel Moderador</h1>
              <p className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">
                Alternativas en Ciencias Sociales
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-black border border-[#262626] px-3 py-1.5 rounded-sm">
            <div className={`w-2 h-2 rounded-full ${
              eventoEnVivo?.estado_transmision === 'en_vivo' 
                ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' 
                : 'bg-gray-700'
            }`}></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {eventoEnVivo?.estado_transmision === 'en_vivo' ? 'En Vivo' : 'Inactivo'}
            </span>
          </div>
          
          <div className="h-4 w-px bg-[#262626]"></div>
          
          <button 
            onClick={() => {
              if(eventoEnVivo?.enlace_publico) {
                navigator.clipboard.writeText(eventoEnVivo.enlace_publico);
                alert('Enlace de proyector copiado al portapapeles');
              }
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <Share2 size={16} className="group-hover:text-blue-500 transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Proyecto Link</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full backdrop-blur-sm">
          
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 relative overflow-hidden group min-h-[300px] flex flex-col">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
              <div className="relative z-10 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1 block">Live Operative Mode</span>
                    <h2 className="text-xl md:text-2xl font-light text-white tracking-tight leading-tight mb-1 line-clamp-2">
                       {currentAct?.titulo || (eventoEnVivo?.estado_transmision === 'inactivo' ? 'Evento no iniciado' : 'Esperando actividad...')}
                    </h2>
                    <p className="text-gray-500 text-[9px] font-medium uppercase tracking-widest truncate">
                      {currentAct?.responsable ? `PONENTES: ${currentAct.responsable}` : 'SIN RESPONSABLE'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Crono</span>
                    <div className="text-4xl md:text-5xl font-light text-white tabular-nums tracking-tighter leading-none border-l border-[#262626] pl-4">
                      {formatoTiempo(cronometro)}
                    </div>
                  </div>
                </div>

                {currentAct?.presentacion_url ? (
                  <div className="flex-1 w-full bg-black rounded-sm border border-[#262626] overflow-hidden my-1 relative h-[35vh] max-h-[450px] min-h-[250px] shadow-2xl flex items-center justify-center">
                    {isImage(currentAct.presentacion_url) ? (
                      <img 
                        src={currentAct.presentacion_url} 
                        className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-500" 
                        alt="Preview" 
                      />
                    ) : isPDF(currentAct.presentacion_url) ? (
                      <PDFPresenter 
                        url={currentAct.presentacion_url} 
                        pageNumber={paginaActual} 
                        className="w-full h-full"
                      />
                    ) : (
                      <iframe 
                        key={currentAct.id}
                        src={getIframeUrl(currentAct.presentacion_url)}
                        className="absolute inset-0 w-full h-full border-0"
                        loading="eager"
                        title="Viewport"
                      />
                    )}
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded-sm border border-white/10 text-[8px] font-black text-purple-400 uppercase tracking-widest backdrop-blur-md">
                       {isImage(currentAct.presentacion_url) ? 'IMAGE' : isYoutube(currentAct.presentacion_url) ? 'YOUTUBE' : currentAct?.presentacion_url?.toLowerCase().endsWith('.pptx') ? 'PPT LINKED' : `PÁG. ${paginaActual}`}
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto mb-4 bg-black/40 border border-[#1a1a1a] p-4 rounded-sm flex items-center justify-center border-dashed">
                    <div className="text-center">
                       <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.3em]">No Media Detected</p>
                       <div className="w-32 h-[1px] bg-[#1a1a1a] mx-auto my-2"></div>
                       <p className="text-[8px] text-gray-800 uppercase font-bold">Waiting for presentation</p>
                    </div>
                  </div>
                )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
               <button 
                  onClick={() => eventoEnVivo?.estado_transmision === 'inactivo' ? iniciarEvento() : togglePause()}
                  className={`flex flex-col items-center justify-center p-3 rounded-sm border transition-all ${
                     eventoEnVivo?.estado_transmision === 'inactivo' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                     isPlaying ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 
                     'bg-green-500/10 border-green-500/20 text-green-500'
                  }`}
               >
                 {eventoEnVivo?.estado_transmision === 'inactivo' ? <Play size={18}/> : isPlaying ? <Pause size={18}/> : <Play size={18}/>}
                 <span className="text-[8px] font-black uppercase mt-2 tracking-tighter">
                   {eventoEnVivo?.estado_transmision === 'inactivo' ? 'Iniciar' : isPlaying ? 'Pausar' : 'Play'}
                 </span>
               </button>

               <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-2 gap-1 flex-1">
                     <button onClick={anteriorActividad} disabled={eventoEnVivo?.programa.findIndex(a => a.id === eventoEnVivo.actividad_actual_id) <= 0} className="flex items-center justify-center bg-[#111] border border-[#262626] text-gray-600 hover:text-white disabled:opacity-10"><ChevronLeft size={14}/></button>
                     <button onClick={siguienteActividad} className="flex items-center justify-center bg-[#111] border border-[#262626] text-gray-600 hover:text-white"><ChevronRight size={14}/></button>
                  </div>
                  <button onClick={siguienteActividad} className="w-full py-1.5 bg-white/5 border border-white/5 text-[7px] font-black text-gray-500 uppercase">Skip</button>
               </div>

               <div className="flex flex-col bg-[#0A0A0A] border border-[#262626] rounded-sm p-2 gap-2">
                  <div className="grid grid-cols-2 gap-1">
                     <button onClick={() => agregarTiempo(1)} className="py-1 bg-blue-500/10 border border-blue-500/10 text-blue-400 text-[9px] font-bold">+1m</button>
                     <button onClick={() => agregarTiempo(-1)} className="py-1 bg-red-500/10 border border-red-500/10 text-red-400 text-[9px] font-bold">-1m</button>
                  </div>
                  <button onClick={() => agregarTiempo(5)} className="w-full py-1 bg-blue-500 text-white rounded-sm text-[8px] font-black uppercase">+5 MIN</button>
               </div>

               <div className={`flex flex-col p-1.5 border rounded-sm transition-colors ${currentAct?.presentacion_url?.toLowerCase().endsWith('.pptx') ? 'border-amber-500/20' : 'border-[#262626]'}`}>
                  {currentAct?.presentacion_url?.toLowerCase().endsWith('.pptx') ? (
                     <div className="h-full flex flex-col items-center justify-center"><Monitor size={12} className="text-amber-500/50 mb-1" /><span className="text-[7px] text-amber-500 font-bold uppercase">Manual</span></div>
                  ) : currentAct?.presentacion_url ? (
                     <div className="flex flex-col gap-1.5 h-full">
                        <div className="flex justify-between items-center px-1"><span className="text-[7px] text-gray-600 uppercase font-bold">P.</span><span className="text-[11px] font-bold text-purple-400">{paginaActual}</span></div>
                        <div className="grid grid-cols-2 gap-1 flex-1">
                           <button onClick={() => cambiarPagina(-1)} disabled={paginaActual <= 1} className="bg-purple-500/5 border border-purple-500/10 text-gray-400 disabled:opacity-20 flex items-center justify-center"><ChevronLeft size={12}/></button>
                           <button onClick={() => cambiarPagina(1)} className="bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center"><ChevronRight size={12}/></button>
                        </div>
                     </div>
                  ) : <div className="h-full flex items-center justify-center grayscale"><Monitor size={14} className="text-gray-800" /></div>}
               </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-[#262626] bg-[#050505] flex justify-between items-center">
                   <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <List size={10} /> Agenda Operativa
                   </h3>
                   <div className="flex gap-2">
                     <button onClick={() => setShowProgramEditor(true)} className="px-3 py-1 bg-blue-500 text-white rounded-sm text-[8px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/10 hover:translate-y-[-1px] transition-all">Editar Programa</button>
                     <button onClick={finalizarEvento} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-sm text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Finalizar</button>
                   </div>
                </div>
               <div className="divide-y divide-[#1a1a1a] max-h-[800px] overflow-y-auto custom-scrollbar">
                 {eventoEnVivo?.programa.map((act) => (
                   <div key={act.id} className={`p-3 flex items-center gap-4 transition-colors ${act.id === eventoEnVivo.actividad_actual_id ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}>
                     <div className={`w-8 h-8 rounded-sm flex items-center justify-center border ${act.id === eventoEnVivo.actividad_actual_id ? 'bg-blue-500 text-white border-blue-400' : 'bg-black text-gray-700 border-[#262626]'}`}>{getIconoActividad(act.tipo)}</div>
                     <div className="flex-1 min-w-0">
                       <h4 className={`text-xs font-bold tracking-tight leading-snug break-words ${act.id === eventoEnVivo.actividad_actual_id ? 'text-blue-400' : 'text-gray-300'}`}>{act.titulo}</h4>
                       <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{act.responsable} • <span className="text-gray-700">{act.duracion_minutos} MIN</span></p>
                     </div>
                     <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-sm border ${act.id === eventoEnVivo.actividad_actual_id ? 'bg-blue-500 text-white border-blue-400' : 'text-gray-800 border-[#262626]'}`}>{act.id === eventoEnVivo.actividad_actual_id ? 'Actual' : act.estado}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
             {/* Intercomunicador (Prioridad Operativa) */}
             <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-[#262626] pb-3">
                   <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                     <MessageSquare size={10} /> Intercomunicador
                   </h3>
                   <div className="flex items-center gap-1">
                     <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                     <span className="text-[7px] text-gray-600 font-bold uppercase">Ready</span>
                   </div>
                </div>
                <div className="space-y-3">
                   <textarea 
                     value={mensajeIntercom}
                     onChange={(e) => setMensajeIntercom(e.target.value)}
                     placeholder="ESCRIBE EL MENSAJE PARA EL PÚBLICO..."
                     className="w-full bg-black border border-[#262626] rounded-sm p-3 text-[11px] text-white min-h-[90px] outline-none resize-none placeholder:text-gray-800 transition-all focus:border-blue-500/50"
                   />
                   
                   <div className="grid grid-cols-2 gap-1 pb-1">
                      {[
                        "SILENCIO POR FAVOR",
                        "INICIAMOS EN 5 MIN",
                        "FAVOR CONCLUIR",
                        "SESIÓN DE PREGUNTAS",
                        "RECUERDEN EL REGISTRO",
                        "RECESO DE 15 MIN"
                      ].map((msg) => (
                        <button
                          key={msg}
                          onClick={() => setMensajeIntercom(msg)}
                          className="px-2 py-1.5 bg-[#111] border border-[#262626] text-[7.5px] font-bold text-gray-500 uppercase hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-all truncate text-left"
                        >
                          {msg}
                        </button>
                      ))}
                   </div>

                   <div className="flex gap-2">
                      <button 
                        onClick={limpiarNotificacion} 
                        className="p-2.5 bg-red-500/5 text-red-500 rounded-sm border border-red-500/10 hover:bg-red-500/20 transition-all group"
                        title="Limpiar pantalla"
                      >
                        <RotateCcw size={16} className="group-active:rotate-[-45deg] transition-transform"/>
                      </button>
                      <button 
                        onClick={() => enviarNotificacion()} 
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
                      >
                        Enviar al Proyector
                      </button>
                   </div>
                   <div className="flex justify-between items-center px-1">
                      <p className="text-[7px] text-gray-700 font-bold uppercase tracking-tight">Auto-cierre: 15 seg.</p>
                      <p className="text-[7px] text-blue-500/50 font-mono italic">SGR Protocol v2.8</p>
                   </div>
                </div>
             </div>

             {/* Public Feed (Monitor de Salida) */}
             <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 space-y-5">
               <div className="flex justify-between items-center border-b border-[#262626] pb-3">
                  <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Public Feed</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[8px] font-bold text-green-500 uppercase">Live</span>
                  </div>
               </div>
               
               <div className="aspect-video bg-black rounded-sm border border-[#262626] relative flex items-center justify-center overflow-hidden group shadow-inner">
                  {eventoFull?.cover_image_url && <img src={eventoFull.cover_image_url} alt="Flyer" className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity group-hover:opacity-80" />}
                  <div className="relative z-10 text-center scale-90">
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.4em] mb-2">Monitor Output</p>
                    <h4 className="text-[11px] font-bold text-white mb-3 uppercase tracking-wider max-w-[250px] mx-auto leading-tight">{currentAct?.titulo || 'Standby Mode'}</h4>
                    <span className="text-3xl font-light text-white tabular-nums tracking-tighter opacity-80">{formatoTiempo(cronometro)}</span>
                  </div>
               </div>
               
               {/* Panel de Transmisión y Presentación — Dos Modos */}
               <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm overflow-hidden">

                 {/* Header */}
                 <div className="px-5 py-3 border-b border-[#262626] flex items-center justify-between">
                   <h3 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <Radio size={10} /> Transmisión
                   </h3>
                   {isCapturing && (
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                       <span className="text-[7px] font-bold text-green-400 uppercase tracking-wider">Capturando activo</span>
                     </div>
                   )}
                 </div>

                 {/* Selector de Modo */}
                 <div className="grid grid-cols-2 border-b border-[#262626]">
                   <button
                     onClick={() => setPanelTab('presentar')}
                     className={`py-2.5 text-[8px] font-black uppercase tracking-widest transition-all border-b-2 ${
                       panelTab === 'presentar'
                         ? 'bg-blue-500/10 text-blue-400 border-blue-500'
                         : 'text-gray-600 hover:text-gray-300 hover:bg-white/5 border-transparent'
                     }`}
                   >
                     📊 Presentar
                   </button>
                   <button
                     onClick={() => setPanelTab('fb')}
                     className={`py-2.5 text-[8px] font-black uppercase tracking-widest transition-all border-b-2 ${
                       panelTab === 'fb'
                         ? 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]'
                         : 'text-gray-600 hover:text-gray-300 hover:bg-white/5 border-transparent'
                     }`}
                   >
                     📺 Facebook Live
                   </button>
                 </div>

                 {/* ── TAB: PRESENTAR ── */}
                 {panelTab === 'presentar' && (
                   <div className="px-5 pb-5 pt-4 space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">

                     {/* Modo 1: Capturar Zoom/Meet/Teams con audio */}
                     <div className="space-y-2">
                       <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest block flex items-center gap-2">
                         <Monitor size={10} /> Capturar Ventana con Audio
                       </label>
                       <p className="text-[8px] text-gray-600 leading-relaxed">
                         Captura Zoom, Meet, Teams u otra ventana y muéstrala en el proyector con audio.
                       </p>
                       {!isCapturing ? (
                         <button
                           onClick={async () => {
                             // Si no hay proyector abierto, lo abrimos primero
                             if (!projectorWindowRef.current || projectorWindowRef.current.closed) {
                               abrirProyectorConRef();
                               // Esperar a que cargue antes de capturar
                               await new Promise(r => setTimeout(r, 2500));
                             }
                             iniciarCapturaPantalla();
                           }}
                           className="w-full py-2.5 bg-blue-600 text-white rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                         >
                           <Monitor size={14} />
                           Capturar Ventana (Zoom / Meet)
                         </button>
                       ) : (
                         <>
                           <div className="aspect-video bg-black rounded-sm border border-green-500/20 overflow-hidden relative">
                             <video ref={fbPreviewRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                             <div className="absolute top-2 left-2 bg-black/70 border border-green-500/30 px-2 py-1 rounded-sm flex items-center gap-1.5">
                               <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                               <span className="text-[7px] font-bold text-green-400 uppercase">En el Proyector</span>
                             </div>
                           </div>
                           <button
                             onClick={detenerCaptura}
                             className="w-full py-2.5 bg-red-600/80 text-white rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-red-500 transition-all flex items-center justify-center gap-2"
                           >
                             <Square size={14} />
                             Detener Captura
                           </button>
                         </>
                       )}
                     </div>

                     <div className="h-px bg-[#1a1a1a]"></div>

                     {/* Modo 2: Abrir proyector para compartir en Zoom/Meet */}
                     <div className="space-y-2">
                       <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block flex items-center gap-2">
                         <ExternalLink size={10} /> Compartir en Zoom / Meet
                       </label>
                       <button
                         onClick={abrirProyectorConRef}
                         className="w-full py-2.5 bg-white/5 border border-[#262626] text-gray-300 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                       >
                         <ExternalLink size={14} />
                         Abrir Proyector en Ventana
                       </button>
                       <div className="bg-white/3 border border-white/5 rounded-sm p-3 space-y-1">
                         <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Cómo compartir en Zoom/Meet</p>
                         <ol className="text-[8px] text-gray-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                           <li>Abre el proyector (botón ↑)</li>
                           <li>En Zoom/Meet → <strong className="text-gray-400">Compartir pantalla</strong></li>
                           <li>Selecciona <strong className="text-gray-400">"Ventana"</strong> → SGR Proyector</li>
                           <li>✅ Activa <strong className="text-gray-400">"Compartir audio"</strong></li>
                         </ol>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* ── TAB: FACEBOOK LIVE ── */}
                 {panelTab === 'fb' && (
                   <div className="px-5 pb-5 pt-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">

                     {/* Clave de Transmision - cambia por sesion */}
                     <div className="space-y-2">
                       <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Clave de Transmisión</label>
                       <div className="flex gap-1">
                         <input
                           type="text"
                           value={fbStreamKey}
                           onChange={(e) => setFbStreamKey(e.target.value)}
                           className="flex-1 bg-black border border-[#262626] text-[9px] font-mono text-white rounded-sm px-3 py-2 outline-none focus:border-[#1877F2]/70 transition-all"
                           placeholder="Pega aqui la clave: FB-XXXX..."
                         />
                         <button
                           onClick={() => copiarTexto(fbStreamKey)}
                           className="px-3 py-2 bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] rounded-sm text-[8px] font-black uppercase hover:bg-[#1877F2]/20 transition-all"
                           title="Copiar clave"
                         >
                           Copy
                         </button>
                       </div>
                     </div>

                     {/* URL Servidor RTMPS - siempre la misma, permanente */}
                     <div className="space-y-2">
                       <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Servidor RTMPS</label>
                       <div className="flex gap-1">
                         <div className="flex-1 bg-black border border-[#262626] text-[8px] font-mono text-gray-400 rounded-sm px-3 py-2 truncate">
                           rtmps://live-api-s.facebook.com:443/rtmp/
                         </div>
                         <button
                           onClick={() => copiarTexto('rtmps://live-api-s.facebook.com:443/rtmp/')}
                           className="px-3 py-2 bg-white/5 border border-[#262626] text-gray-400 rounded-sm text-[8px] font-black uppercase hover:bg-white/10 transition-all"
                         >
                           Copy
                         </button>
                       </div>
                     </div>

                     <button
                       onClick={abrirProyectorConRef}
                       className="w-full py-2.5 bg-white/5 border border-[#262626] text-gray-300 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                     >
                       <ExternalLink size={14} />
                       Abrir Proyector en Ventana
                     </button>

                     {/* OBS Instructions */}
                     <div className="bg-[#1877F2]/5 border border-[#1877F2]/10 rounded-sm p-3 space-y-1.5">
                       <p className="text-[8px] font-black text-[#1877F2] uppercase tracking-widest">Instrucciones OBS</p>
                       <ol className="text-[8px] text-gray-500 space-y-1 list-decimal list-inside leading-relaxed">
                         <li>Abre OBS Studio</li>
                         <li>Configuración → Emisión → RTMPS</li>
                         <li>Pega el servidor y la clave</li>
                         <li>Añade "Captura de Ventana" del proyector</li>
                         <li>Haz clic en "Iniciar Transmisión"</li>
                       </ol>
                     </div>
                   </div>
                 )}
               </div>
             </div>

             {/* Core Information */}
             <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 space-y-6">
                <div>
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] block mb-3">Core Information</span>
                  <div className="space-y-4">
                     <div className="flex items-start gap-4">
                        <div className="p-2 bg-black border border-[#262626] rounded-sm text-blue-500"><MapPin size={14}/></div>
                        <div>
                           <p className="text-[8px] font-bold text-gray-700 uppercase">Ubicación</p>
                           <p className="text-[11px] text-gray-300 font-medium uppercase">{eventoFull?.is_online ? 'Virtual • Online' : eventoFull?.location || 'Por definir'}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="p-2 bg-black border border-[#262626] rounded-sm text-blue-500"><Users size={14}/></div>
                        <div>
                           <p className="text-[8px] font-bold text-gray-700 uppercase">Audiencia</p>
                           <div className="flex items-baseline gap-2">
                             <p className="text-xl font-light text-white tracking-tighter">{eventoFull?.event_participants?.[0]?.count || 0}</p>
                             <span className="text-[8px] text-gray-700 font-bold uppercase">Registros</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </main>
      
      {cronometro <= 120 && isPlaying && (
        <div className="bg-amber-600 px-8 py-2 text-center relative overflow-hidden shrink-0">
           <div className="absolute inset-0 bg-white/10 animate-[pulse_1s_infinite]"></div>
           <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-3 relative z-10">
             <Timer size={14} className="animate-bounce" />
             Atención Especial: El bloque actual expira en menos de 120 segundos
           </p>
        </div>
      )}

      {showProgramEditor && (
        <ProgramCreator
          eventId={eventId}
          onSave={() => { setShowProgramEditor(false); loadEventoEnVivo(); }}
          onCancel={() => setShowProgramEditor(false)}
        />
      )}
    </div>
  );
};
