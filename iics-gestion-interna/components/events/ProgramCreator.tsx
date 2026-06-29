import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Clock, User, Calendar, Save, Trash2, ArrowUp, ArrowDown, Sparkles, Loader2, Upload, FileText, Check, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { extractProgramActivities } from '../../lib/ai';


interface ActividadPrograma {
  id: string;
  tipo: string;
  titulo: string;
  responsable: string;
  duracion_minutos: number;
  orden: number;
  estado?: 'pendiente' | 'en_vivo' | 'completado';
  presentacion_url?: string;
}

interface ProgramCreatorProps {
  eventId: string;
  onSave: (programa: ActividadPrograma[]) => void;
  onCancel: () => void;
}

export const ProgramCreator: React.FC<ProgramCreatorProps> = ({ eventId, onSave, onCancel }) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [programa, setPrograma] = useState<ActividadPrograma[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nuevaActividad, setNuevaActividad] = useState<Partial<ActividadPrograma>>({
    tipo: 'ponencia',
    titulo: '',
    responsable: '',
    duracion_minutos: 20,
    presentacion_url: ''
  });

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);

  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeLabel, setCustomTypeLabel] = useState('');

  // AI-related states
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [aiText, setAiText] = useState('');
  const [parsingAi, setParsingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);


  useEffect(() => {
    fetchExistingProgram();
  }, [eventId]);

  const fetchExistingProgram = async () => {
    if (!eventId) {
        setError('ID de evento no válido');
        setLoading(false);
        return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('eventos_en_vivo')
        .select('programa')
        .eq('evento_id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No hay programa previo, es normal
          setLoading(false);
          return;
        }
        console.error('Supabase error fetching program:', error);
        throw new Error(`${error.message} (${error.code})`);
      }

      if (data && data.programa && data.programa.length > 0) {
        setPrograma(data.programa);
      } else {
        // Valores por defecto si no hay nada
        setPrograma([
          {
            id: 'bienvenida_001',
            tipo: 'bienvenida',
            titulo: 'Palabras de Bienvenida',
            responsable: 'Anfitrión',
            duracion_minutos: 5,
            orden: 1,
            estado: 'pendiente'
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching program:', err);
      setError('No se pudo cargar el programa existente');
    } finally {
      setLoading(false);
    }
  };

  const subirArchivo = async (file: File, index: number | 'new') => {
    const isNew = index === 'new';
    if (isNew) setUploadingNew(true);
    else setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `event-presentations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      if (isNew) {
        setNuevaActividad(prev => ({ ...prev, presentacion_url: publicUrl }));
      } else {
        const nuevo = [...programa];
        nuevo[index as number].presentacion_url = publicUrl;
        setPrograma(nuevo);
      }
    } catch (err) {
      console.error('Error subiendo archivo:', err);
      toast('error', 'Error al subir el archivo');
    } finally {
      if (isNew) setUploadingNew(false);
      else setUploadingIndex(null);
    }
  };

  const agregarActividad = () => {
    if (!nuevaActividad.titulo || !nuevaActividad.responsable) {
      setError('Complete título y responsable');
      return;
    }

    const nueva: ActividadPrograma = {
      id: `${nuevaActividad.tipo}_${Date.now()}`,
      tipo: isCustomType ? customTypeLabel || 'OTRO' : (nuevaActividad.tipo || 'ponencia'),
      titulo: nuevaActividad.titulo,
      responsable: nuevaActividad.responsable,
      duracion_minutos: nuevaActividad.duracion_minutos || 20,
      orden: programa.length + 1,
      estado: 'pendiente',
      presentacion_url: nuevaActividad.presentacion_url || ''
    };

    setPrograma([...programa, nueva]);
    setNuevaActividad({
      tipo: 'ponencia',
      titulo: '',
      responsable: '',
      duracion_minutos: 20,
      presentacion_url: ''
    });
    setCustomTypeLabel('');
    setIsCustomType(false);
    setError(null);
  };

  const procesarProgramaConIA = async (appendMode: boolean) => {
    if (!aiText.trim()) {
      setAiError('Ingresa el texto del programa para procesar');
      return;
    }

    setParsingAi(true);
    setAiError(null);
    try {
      const parsed = await extractProgramActivities(aiText);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No se pudieron extraer bloques de cronograma del texto provisto o la respuesta no tiene el formato correcto');
      }

      // Convertir a ActividadPrograma
      const timestamp = Date.now();
      const mappedActividades: ActividadPrograma[] = parsed.map((item: any, idx: number) => ({
        id: `${item.tipo || 'otro'}_ai_${timestamp}_${idx}`,
        tipo: item.tipo || 'otro',
        titulo: item.titulo || 'Actividad sin título',
        responsable: item.responsable || 'Anfitrión',
        duracion_minutos: parseInt(item.duracion_minutos) || 20,
        orden: idx + 1,
        estado: 'pendiente',
        presentacion_url: ''
      }));

      if (appendMode) {
        const offset = programa.length;
        const ajustadas = mappedActividades.map((act, index) => ({
          ...act,
          orden: offset + index + 1
        }));
        setPrograma([...programa, ...ajustadas]);
        toast('success', `Se añadieron ${ajustadas.length} actividades con IA`);
      } else {
        const confirmed = await confirm(
          'REEMPLAZAR TODO',
          '¿Estás seguro de que deseas reemplazar la lista actual por los bloques detectados por la IA?',
          { confirmText: 'REEMPLAZAR', cancelText: 'CANCELAR', isDestructive: true }
        );
        if (confirmed) {
          setPrograma(mappedActividades);
          toast('success', `Se cargó el cronograma con ${mappedActividades.length} actividades con IA`);
        }
      }

      setAiText('');
      setActiveTab('manual');
    } catch (err: any) {
      console.error('Error procesando programa con IA:', err);
      setAiError(err.message || 'Error al procesar el texto con la IA');
    } finally {
      setParsingAi(false);
    }
  };


  const eliminarActividad = (id: string) => {
    setPrograma(programa.filter(a => a.id !== id));
  };

  const moverActividad = (id: string, direccion: 'arriba' | 'abajo') => {
    const index = programa.findIndex(a => a.id === id);
    if (index === -1) return;

    const nuevoPrograma = [...programa];
    const actividad = nuevoPrograma[index];
    
    if (direccion === 'arriba' && index > 0) {
      nuevoPrograma[index] = nuevoPrograma[index - 1];
      nuevoPrograma[index - 1] = actividad;
    } else if (direccion === 'abajo' && index < programa.length - 1) {
      nuevoPrograma[index] = nuevoPrograma[index + 1];
      nuevoPrograma[index + 1] = actividad;
    }
    
    nuevoPrograma.forEach((act, idx) => {
      act.orden = idx + 1;
    });
    
    setPrograma(nuevoPrograma);
  };

  const getIconoActividad = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('bienvenida')) return <div className="p-2 bg-blue-500/10 rounded-sm border border-blue-500/30 text-blue-400">👋</div>;
    if (t.includes('himno')) return <div className="p-2 bg-emerald-500/10 rounded-sm border border-emerald-500/30 text-emerald-400">🎵</div>;
    if (t.includes('ponencia') || t.includes('charla')) return <div className="p-2 bg-amber-500/10 rounded-sm border border-amber-500/30 text-amber-400">🎤</div>;
    if (t.includes('preguntas')) return <div className="p-2 bg-purple-500/10 rounded-sm border border-purple-500/30 text-purple-400">❓</div>;
    if (t.includes('cierre')) return <div className="p-2 bg-red-500/10 rounded-sm border border-red-500/30 text-red-400">✅</div>;
    if (t.includes('break') || t.includes('receso')) return <div className="p-2 bg-gray-500/10 rounded-sm border border-gray-500/30 text-gray-400">☕</div>;
    return <div className="p-2 bg-blue-500/10 rounded-sm border border-blue-500/30 text-blue-400">📅</div>;
  };

  const handleSave = async () => {
    if (programa.length === 0) {
      setError('El programa debe tener al menos una actividad');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const { data: existing } = await supabase
        .from('eventos_en_vivo')
        .select('id')
        .eq('evento_id', eventId)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from('eventos_en_vivo')
          .update({ 
            programa,
            ultima_actualizacion: new Date().toISOString()
          })
          .eq('evento_id', eventId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('eventos_en_vivo')
          .insert({
            evento_id: eventId,
            actividad_actual_id: programa[0].id,
            tiempo_restante_segundos: programa[0].duracion_minutos * 60,
            estado_transmision: 'inactivo',
            enlace_publico: `${window.location.origin}/evento/${eventId}/vivo`,
            programa,
            ultima_actualizacion: new Date().toISOString()
          });
        if (insertError) throw insertError;
      }

      const channel = supabase.channel(`evento_${eventId}_sync`);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'estado_actualizado',
            payload: { programa }
          });
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });

      onSave(programa);
    } catch (err: any) {
      console.error('Error saving program:', err);
      setError('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const eliminarProgramaCompleto = async () => {
    const confirmed = await confirm(
        'ELIMINAR PROGRAMA',
        '¿Estás seguro de que deseas eliminar TODO el programa de este evento? Esta acción no se puede deshacer.',
        { isDestructive: true, confirmText: 'ELIMINAR TODO', cancelText: 'CANCELAR' }
    );
    if (!confirmed) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('eventos_en_vivo')
        .delete()
        .eq('evento_id', eventId);

      if (error) throw error;
      
      await supabase.channel(`evento_${eventId}`).send({
        type: 'broadcast',
        event: 'estado_actualizado',
        payload: { programa: null }
      });

      setPrograma([]);
      onSave([]);
    } catch (err: any) {
      console.error('Error deleting program:', err);
      setError('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const limpiarListaLocal = async () => {
    if (programa.length === 0) return;
    
    const confirmed = await confirm(
        'LIMPIAR LISTA',
        '¿Deseas limpiar la lista local? Esto no borrará el programa de la base de datos hasta que guardes.',
        { confirmText: 'LIMPIAR AHORA', cancelText: 'CANCELAR' }
    );
    
    if (!confirmed) return;
    setPrograma([]);
  };

  const exportarAPDF = () => {
    if (programa.length === 0) return;
    
    const doc = new jsPDF();
    const now = new Date();
    const timestamp = now.toLocaleString();

    // Configuración de Estilo
    doc.setFillColor(2, 6, 23); // Dark Blue background for header area
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CRONOGRAMA DE EVENTO', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('GENERADO POR SGR-ACS • SISTEMA DE GESTIÓN DE EVENTOS', 15, 28);
    
    // Ajuste de Fecha de Emisión (Alineación Derecha para evitar cortes)
    doc.setFontSize(9);
    doc.text(`FECHA DE EMISIÓN: ${timestamp}`, 195, 28, { align: 'right' });

    // Función para limpiar strings corruptos (ej: &P&o&n&e&n&c&i&a& -> Ponencia)
    const sanitizarTexto = (texto: string) => {
      if (!texto) return '';
      // Detectar el patrón de corrupción donde '&' se intercala entre cada carácter
      // Patrones: "&P&o&n&e&n&c&i&a&", "&P&o&n&e&n&c&i&a", "P&o&n&e&n&c&i&a"
      if (texto.includes('&')) {
        // Patrón 1: texto que empieza con & y tiene & entre cada carácter (ej: &P&o&n&e&n)
        // Patrón 2: texto donde hay & cada 2 posiciones aproximadamente
        const sinAmpersands = texto.replace(/&/g, '');
        const cantidadAmpersands = (texto.match(/&/g) || []).length;
        // Si la cantidad de '&' es cercana a la cantidad de caracteres reales, está corrupto
        if (cantidadAmpersands >= sinAmpersands.length * 0.5 && cantidadAmpersands >= 2) {
          return sinAmpersands.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
      // Reemplazar saltos de línea y tabs para evitar bugs en autoTable
      return texto.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const tableData = programa.map((act, index) => [
      (index + 1).toString(),
      sanitizarTexto(act.tipo.toUpperCase()),
      sanitizarTexto(act.titulo),
      sanitizarTexto(act.responsable),
      `${act.duracion_minutos} min`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['#', 'TIPO', 'ACTIVIDAD / BLOQUE', 'RESPONSABLE', 'DURACIÓN']],
      body: tableData,
      headStyles: { 
        fillColor: [37, 99, 235], // Blue-600
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [50, 50, 50],
        cellPadding: 3 // Reducido de 6 a 3 para dar más espacio a los datos y evitar saltos de línea
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 }, // 12mm es suficiente con padding 3
        1: { fontStyle: 'bold', cellWidth: 35 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 30 }
      },
      margin: { top: 50 }
    });

    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} • Gestión Oficial de Comunicaciones ACS`, 15, 285);
    }

    doc.save(`Programa_Evento_${eventId}.pdf`);
  };

  return (
    <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-[#050505] border border-[#262626] rounded-sm max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#262626] bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
              <span className="material-symbols-outlined text-blue-500 text-2xl">list_alt</span>
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Configurar Programa</h2>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight mt-0.5">Planificación Ejecutiva de Tiempos</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-all group"
          >
            <X size={18} className="text-gray-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[#050505]">
          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-sm">error</span>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : (
            <>
              {/* Actividades Actuales */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Estructura del Evento</h3>
                {programa.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-[#262626] rounded-sm">
                    <p className="text-[10px] font-bold text-gray-600 uppercase">No hay actividades configuradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {programa.map((actividad, index) => (
                      <div 
                        key={actividad.id}
                        className="group bg-[#0A0A0A] border border-[#262626] hover:border-blue-500/30 rounded-sm p-4 flex items-center gap-5 transition-all"
                      >
                        {/* Indice e Icono */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-[9px] font-black text-gray-600">{index + 1}</span>
                          {getIconoActividad(actividad.tipo)}
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                          {/* Fila 1: Título y Duración/Categoría */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-8 flex flex-col gap-1">
                              <label className="text-[8px] font-black text-gray-600 uppercase tracking-tighter px-0.5">Título del Bloque</label>
                              <input
                                type="text"
                                value={actividad.titulo}
                                onChange={(e) => {
                                  const nuevo = [...programa];
                                  nuevo[index].titulo = e.target.value;
                                  setPrograma(nuevo);
                                }}
                                className="w-full bg-black/40 border border-[#262626] text-[11px] font-bold text-white rounded-sm px-3 py-2 outline-none focus:border-blue-500/50 transition-all"
                              />
                            </div>

                            <div className="lg:col-span-4 grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-tighter px-0.5 whitespace-nowrap">DURACIÓN (MIN)</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={actividad.duracion_minutos}
                                    onChange={(e) => {
                                      const nuevo = [...programa];
                                      nuevo[index].duracion_minutos = parseInt(e.target.value) || 1;
                                      setPrograma(nuevo);
                                    }}
                                    className="w-full bg-black/40 border border-[#262626] text-[11px] font-bold text-white rounded-sm pl-3 pr-7 py-2 outline-none focus:border-blue-500/50 transition-all"
                                  />
                                  <Clock size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-tighter px-0.5">ESTADO</label>
                                <div className={`text-[9px] font-black rounded-sm px-2 py-2 text-center h-[31px] flex items-center justify-center border ${
                                  actividad.estado === 'en_vivo' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 
                                  actividad.estado === 'completado' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                                  'bg-white/5 border-white/10 text-gray-500'
                                }`}>
                                  {actividad.estado?.toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Fila 2: Responsable y Presentación */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-5 flex flex-col gap-1">
                              <label className="text-[8px] font-black text-gray-600 uppercase tracking-tighter px-0.5">Responsable</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={actividad.responsable}
                                  onChange={(e) => {
                                    const nuevo = [...programa];
                                    nuevo[index].responsable = e.target.value;
                                    setPrograma(nuevo);
                                  }}
                                  className="w-full bg-black/40 border border-[#262626] text-[11px] font-bold text-white rounded-sm pl-8 pr-3 py-2 outline-none focus:border-blue-500/50 transition-all"
                                />
                                <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
                              </div>
                            </div>

                            <div className="lg:col-span-7 flex flex-col gap-1">
                              <label className="text-[8px] font-black text-gray-600 uppercase tracking-tighter px-0.5 whitespace-nowrap">Recurso Multimedia (Imagen / YouTube / Documento)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={actividad.presentacion_url || ''}
                                  onChange={(e) => {
                                    const nuevo = [...programa];
                                    nuevo[index].presentacion_url = e.target.value;
                                    setPrograma(nuevo);
                                  }}
                                  placeholder="Pega link de YouTube, URL o sube un archivo"
                                  className="flex-1 bg-black/40 border border-[#262626] text-[10px] font-bold text-white rounded-sm px-3 py-2 outline-none focus:border-blue-500/50 transition-all placeholder:text-dark-400"
                                />
                                <label className={`shrink-0 flex items-center justify-center w-10 h-[31px] rounded-sm border cursor-pointer transition-all ${
                                  uploadingIndex === index ? 'bg-blue-500/10 border-blue-500/50' : actividad.presentacion_url ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-[#262626] hover:border-blue-500/50 text-gray-500'
                                }`}>
                                  {uploadingIndex === index ? (
                                    <Loader2 size={12} className="animate-spin text-blue-500" />
                                  ) : (
                                    <Upload size={14} />
                                  )}
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp,.gif"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) subirArchivo(file, index);
                                    }}
                                    disabled={uploadingIndex === index}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botones de Control */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => moverActividad(actividad.id, 'arriba')}
                            disabled={index === 0}
                            className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/5 border border-[#262626] text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moverActividad(actividad.id, 'abajo')}
                            disabled={index === programa.length - 1}
                            className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/5 border border-[#262626] text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => eliminarActividad(actividad.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-sm bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de Pestaña / Método de Creación */}
              <div className="flex border-b border-[#262626] gap-2">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'manual'
                      ? 'border-blue-500 text-white bg-blue-500/5'
                      : 'border-transparent text-gray-500 hover:text-white'
                  }`}
                >
                  <Plus size={12} />
                  Creación Manual
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'ai'
                      ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                      : 'border-transparent text-gray-500 hover:text-white'
                  }`}
                >
                  <Sparkles size={12} className="text-purple-400 animate-pulse" />
                  Asistente IA (Mercury)
                </button>
              </div>

              {activeTab === 'manual' ? (
                /* Añadir Nueva (Manual) */
                <div className="bg-[#0D0D0D] border border-blue-500/20 border-dashed rounded-sm p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Plus size={14} className="text-blue-500" />
                    </div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Insertar Nueva Actividad</h3>
                  </div>


                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-4">
                  <div className="space-y-1.5 flex-1 md:col-span-12 lg:col-span-3">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-tighter px-1">TIPO DE BLOQUE</label>
                    <div className="relative">
                      <select
                        value={nuevaActividad.tipo}
                        onChange={(e) => setNuevaActividad({...nuevaActividad, tipo: e.target.value as any})}
                        className="w-full bg-[#050505] border border-[#262626] text-[11px] font-bold text-white rounded-sm px-4 py-3 outline-none focus:border-blue-500/50 appearance-none shadow-inner"
                      >
                        <option value="bienvenida">BIENVENIDA / APERTURA</option>
                        <option value="himno">HIMNO / PROTOCOLO</option>
                        <option value="conferencia">CONFERENCIA MAGISTRAL</option>
                        <option value="ponencia">PONENCIA / CHARLA</option>
                        <option value="panel">PANEL DE EXPERTOS</option>
                        <option value="musical">NÚMERO MUSICAL / ARTÍSTICO</option>
                        <option value="taller">TALLER / PRÁCTICA</option>
                        <option value="comentario">COMENTARIOS / ANÁLISIS</option>
                        <option value="preguntas">RONDA DE PREGUNTAS</option>
                        <option value="sorteo">SORTEO / PREMIACIÓN</option>
                        <option value="networking">NETWORKING / SOCIAL</option>
                        <option value="break">RECESO / COFFEE BREAK</option>
                        <option value="cierre">PALABRAS DE CIERRE</option>
                        <option value="otro">OTRO / PERSONALIZADO...</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                        <ArrowDown size={12} />
                      </div>
                    </div>

                    {nuevaActividad.tipo === 'otro' && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <input
                          type="text"
                          placeholder="Escribe la categoría..."
                          value={customTypeLabel}
                          onChange={(e) => {
                            setCustomTypeLabel(e.target.value.toUpperCase());
                            setIsCustomType(true);
                          }}
                          className="w-full bg-[#080808] border border-blue-500/30 text-[10px] font-bold text-white rounded-sm px-3 py-2 outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-12 lg:col-span-6">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-tighter px-1">Título de la Actividad</label>
                    <input
                      type="text"
                      value={nuevaActividad.titulo}
                      onChange={(e) => setNuevaActividad({...nuevaActividad, titulo: e.target.value})}
                      className="w-full bg-[#050505] border border-[#262626] text-[11px] font-bold text-white rounded-sm px-4 py-3 outline-none focus:border-blue-500/50 shadow-inner"
                      placeholder="Ej: Innovación en la gestión..."
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-12 lg:col-span-3">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-tighter px-1">DURACIÓN (MIN)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={nuevaActividad.duracion_minutos}
                        onChange={(e) => setNuevaActividad({...nuevaActividad, duracion_minutos: parseInt(e.target.value) || 1})}
                        className="w-full bg-[#050505] border border-[#262626] text-[11px] font-bold text-white rounded-sm pl-4 pr-10 py-3 outline-none focus:border-blue-500/50 shadow-inner"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600">MIN</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-4">
                  <div className="space-y-1.5 md:col-span-12 lg:col-span-6">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-tighter px-1">Responsable Sugerido</label>
                    <input
                      type="text"
                      value={nuevaActividad.responsable}
                      onChange={(e) => setNuevaActividad({...nuevaActividad, responsable: e.target.value})}
                      className="w-full bg-[#050505] border border-[#262626] text-[11px] font-bold text-white rounded-sm px-4 py-3 outline-none focus:border-blue-500/50 shadow-inner"
                      placeholder="Ej: Dr. Ricardo Arjona"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-12 lg:col-span-6">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-tighter px-1">Presentación (PDF / PPTX)</label>
                    <div className="flex gap-2">
                       <input
                        type="text"
                        value={nuevaActividad.presentacion_url || ''}
                        onChange={(e) => setNuevaActividad({...nuevaActividad, presentacion_url: e.target.value})}
                        className="flex-1 bg-[#050505] border border-[#262626] text-[11px] font-bold text-white rounded-sm px-4 py-3 outline-none focus:border-blue-500/50 shadow-inner"
                        placeholder="Pega un enlace o sube un archivo"
                      />
                      <label className={`shrink-0 flex items-center justify-center w-12 h-[46px] rounded-sm border cursor-pointer transition-all ${
                        uploadingNew ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-[#111] border-[#262626] hover:border-blue-500/50 text-gray-400 hover:text-blue-500'
                      }`}>
                        {uploadingNew ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : nuevaActividad.presentacion_url ? (
                          <FileText size={20} className="text-green-500" />
                        ) : (
                          <Upload size={20} />
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.pptx,.ppt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirArchivo(file, 'new');
                          }}
                          disabled={uploadingNew}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={agregarActividad}
                    disabled={uploadingNew || !nuevaActividad.titulo || !nuevaActividad.responsable}
                    className="w-full md:w-auto md:px-12 bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white rounded-sm py-3.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 group"
                  >
                    {uploadingNew ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        SUBIENDO RECURSO...
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        Añadir Bloque al Cronograma
                      </>
                    )}
                  </button>
                </div>
              </div>
              ) : (
                /* Asistente IA (Mercury) */
                <div className="bg-[#0D0D0D] border border-purple-500/20 border-dashed rounded-sm p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-sm bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                      <Sparkles size={14} className="text-purple-400" />
                    </div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Generar Cronograma con IA</h3>
                  </div>

                  {aiError && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{aiError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-tighter px-1">Pega el cronograma del evento en texto</label>
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder={`Ejemplo:\n14:00 Palabras de bienvenida - Director (10 min)\n14:10 Himno Nacional (5 min)\n14:15 Conferencia: El futuro de las Ciencias Sociales por Dr. Marcos Flores\n15:00 Receso (15m)`}
                      className="w-full bg-[#050505] border border-[#262626] text-xs text-white rounded-sm px-4 py-3 min-h-[140px] outline-none focus:border-purple-500/50 shadow-inner font-mono placeholder:text-gray-700"
                      disabled={parsingAi}
                    />
                    <p className="text-[8px] text-gray-600 uppercase tracking-widest font-bold flex items-center gap-1.5 px-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                      Mercury IA extraerá automáticamente bloques, ponentes y duraciones.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <button
                      onClick={() => procesarProgramaConIA(true)}
                      disabled={parsingAi || !aiText.trim()}
                      className="px-6 bg-[#111] hover:bg-[#1a1a1a] text-purple-400 border border-purple-500/30 hover:border-purple-500 disabled:opacity-30 rounded-sm py-3.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {parsingAi ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-purple-400" />
                          PROCESANDO...
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          Añadir al final
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => procesarProgramaConIA(false)}
                      disabled={parsingAi || !aiText.trim()}
                      className="px-8 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-30 rounded-sm py-3.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 group"
                    >
                      {parsingAi ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          PROCESANDO...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                          Reemplazar todo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#262626] bg-[#0A0A0A]">
          <div className="flex items-center gap-6">
            <button
               onClick={eliminarProgramaCompleto}
               className="px-4 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all"
               disabled={saving || programa.length === 0}
               title="Borrar de la base de datos"
            >
              Eliminar Programa
            </button>
            <button
               onClick={limpiarListaLocal}
               className="px-4 py-2 border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all"
               disabled={saving || programa.length === 0}
               title="Limpiar lista actual"
            >
              Limpiar Todo
            </button>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{programa.length} Bloques de Tiempo</span>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
               onClick={exportarAPDF}
               className="px-4 py-2.5 bg-[#111] border border-exec-border text-gray-300 hover:text-white hover:border-blue-500/50 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
               disabled={programa.length === 0}
            >
              <Download size={14} className="text-blue-500" />
              Descargar PDF
            </button>

            <button
               onClick={onCancel}
               className="px-6 py-2.5 border border-[#262626] text-[10px] font-black text-gray-500 uppercase tracking-widest rounded-sm hover:bg-white/5 transition-all"
               disabled={saving}
            >
              Cancelar
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || loading || programa.length === 0 || uploadingIndex !== null || uploadingNew}
              className="px-8 py-2.5 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-sm shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2 transition-all group"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></div>
                  <span>Sincronizando...</span>
                </>
              ) : uploadingIndex !== null || uploadingNew ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Subiendo Archivo...</span>
                </>
              ) : (
                <>
                  <Save size={14} className="group-hover:scale-110 transition-transform" />
                  <span>Publicar Programa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
