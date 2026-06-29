import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface ActividadPrograma {
  id: string;
  tipo: 'bienvenida' | 'himno' | 'ponencia' | 'preguntas' | 'cierre' | 'break';
  titulo: string;
  responsable: string;
  duracion_minutos: number;
  orden: number;
  estado: 'pendiente' | 'en_vivo' | 'completado';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const { pathname } = url;
    
    // Solo permitir POST en el endpoint principal
    if (req.method !== 'POST' || pathname !== '/') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { eventoId, accion, datos, userId } = body;

    // Validar datos requeridos
    if (!eventoId || !accion || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Faltan datos requeridos: eventoId, accion, userId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Crear cliente Supabase
    const supabaseUrl = globalThis.supabaseUrl || Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = globalThis.supabaseServiceKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar permisos del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar si tiene permisos para gestionar el evento
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventoId)
      .single();

    if (eventError) {
      return new Response(JSON.stringify({ error: 'Evento no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tienePermisos = userData.role === 'Director' || 
                         userData.role === 'Subdirector' || 
                         userData.role === 'Coordinador de Eventos' ||
                         eventData.created_by === userId;

    if (!tienePermisos) {
      return new Response(JSON.stringify({ 
        error: 'No tienes permisos para gestionar este evento' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let resultado;
    const timestamp = new Date().toISOString();

    switch (accion) {
      case 'iniciar':
        resultado = await iniciarEvento(supabase, eventoId, datos, timestamp);
        break;
        
      case 'actualizar_tiempo':
        resultado = await actualizarTiempo(supabase, eventoId, datos, timestamp);
        break;
        
      case 'siguiente_actividad':
        resultado = await siguienteActividad(supabase, eventoId, datos, timestamp);
        break;
        
      case 'agregar_tiempo':
        resultado = await agregarTiempo(supabase, eventoId, datos, timestamp);
        break;
        
      case 'pausar':
        resultado = await pausarEvento(supabase, eventoId, timestamp);
        break;
        
      case 'reanudar':
        resultado = await reanudarEvento(supabase, eventoId, timestamp);
        break;
        
      case 'finalizar':
        resultado = await finalizarEvento(supabase, eventoId, timestamp);
        break;
        
      case 'actualizar_programa':
        resultado = await actualizarPrograma(supabase, eventoId, datos, timestamp);
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Acción no válida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (resultado.error) {
      return new Response(JSON.stringify(resultado), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Broadcast del cambio a todos los clientes conectados
    if (resultado.broadcastData) {
      await supabase.channel(`evento_${eventoId}`).send({
        type: 'broadcast',
        event: resultado.broadcastEvent,
        payload: resultado.broadcastData
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: resultado.data,
      timestamp 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en live-events-control:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Funciones auxiliares
async function iniciarEvento(supabase: any, eventoId: string, datos: any, timestamp: string) {
  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .upsert({
      evento_id: eventoId,
      actividad_actual_id: datos.actividad_id,
      tiempo_restante_segundos: datos.tiempo_segundos,
      estado_transmision: 'en_vivo',
      ultima_actualizacion: timestamp
    }, {
      onConflict: 'evento_id'
    })
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'estado_actualizado',
    broadcastData: {
      actividad_actual_id: datos.actividad_id,
      tiempo_restante_segundos: datos.tiempo_segundos,
      estado_transmision: 'en_vivo',
      accion: 'iniciar'
    }
  };
}

async function actualizarTiempo(supabase: any, eventoId: string, datos: any, timestamp: string) {
  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      tiempo_restante_segundos: datos.tiempo,
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'tiempo_actualizado',
    broadcastData: { tiempo: datos.tiempo }
  };
}

async function siguienteActividad(supabase: any, eventoId: string, datos: any, timestamp: string) {
  // Primero obtener el programa actual
  const { data: eventoActual, error: errorActual } = await supabase
    .from('eventos_en_vivo')
    .select('programa')
    .eq('evento_id', eventoId)
    .single();

  if (errorActual) return { error: errorActual };

  const programa: ActividadPrograma[] = eventoActual?.programa || [];
  const currentIndex = programa.findIndex(a => a.id === datos.actividad_actual_id);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= programa.length) {
    // Finalizar evento si no hay más actividades
    return await finalizarEvento(supabase, eventoId, timestamp);
  }

  const siguienteActividad = programa[nextIndex];
  
  // Actualizar estados en el programa
  const programaActualizado = programa.map((act, index) => ({
    ...act,
    estado: index < nextIndex ? 'completado' : index === nextIndex ? 'en_vivo' : 'pendiente'
  }));

  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      actividad_actual_id: siguienteActividad.id,
      tiempo_restante_segundos: siguienteActividad.duracion_minutos * 60,
      programa: programaActualizado,
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'estado_actualizado',
    broadcastData: {
      actividad_actual_id: siguienteActividad.id,
      tiempo_restante_segundos: siguienteActividad.duracion_minutos * 60,
      programa: programaActualizado,
      accion: 'siguiente_actividad'
    }
  };
}

async function agregarTiempo(supabase: any, eventoId: string, datos: any, timestamp: string) {
  const { data: eventoActual, error: errorActual } = await supabase
    .from('eventos_en_vivo')
    .select('tiempo_restante_segundos')
    .eq('evento_id', eventoId)
    .single();

  if (errorActual) return { error: errorActual };

  const nuevoTiempo = (eventoActual?.tiempo_restante_segundos || 0) + (datos.minutos * 60);

  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      tiempo_restante_segundos: nuevoTiempo,
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'tiempo_actualizado',
    broadcastData: { tiempo: nuevoTiempo }
  };
}

async function pausarEvento(supabase: any, eventoId: string, timestamp: string) {
  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      estado_transmision: 'pausado',
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'estado_actualizado',
    broadcastData: {
      estado_transmision: 'pausado',
      accion: 'pausar'
    }
  };
}

async function reanudarEvento(supabase: any, eventoId: string, timestamp: string) {
  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      estado_transmision: 'en_vivo',
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'estado_actualizado',
    broadcastData: {
      estado_transmision: 'en_vivo',
      accion: 'reanudar'
    }
  };
}

async function finalizarEvento(supabase: any, eventoId: string, timestamp: string) {
  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      estado_transmision: 'finalizado',
      tiempo_restante_segundos: 0,
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'estado_actualizado',
    broadcastData: {
      estado_transmision: 'finalizado',
      tiempo_restante_segundos: 0,
      accion: 'finalizar'
    }
  };
}

async function actualizarPrograma(supabase: any, eventoId: string, datos: any, timestamp: string) {
  const { data, error } = await supabase
    .from('eventos_en_vivo')
    .update({
      programa: datos.programa,
      ultima_actualizacion: timestamp
    })
    .eq('evento_id', eventoId)
    .select()
    .single();

  return { 
    data, 
    error,
    broadcastEvent: 'programa_actualizado',
    broadcastData: {
      programa: datos.programa,
      accion: 'actualizar_programa'
    }
  };
}
