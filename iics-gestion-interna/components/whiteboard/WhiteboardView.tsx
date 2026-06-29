import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  StickyNote, 
  Type, 
  MousePointer2, 
  Table, 
  Sparkles, 
  Save, 
  Trash2, 
  Plus, 
  Minus,
  Move,
  Maximize2,
  Settings,
  Share2,
  ArrowLeft,
  Search,
  Clock,
  MoreVertical,
  LayoutGrid,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { generateContent, extractJSON } from '../../lib/ai';

interface Note {
  id: string;
  type: 'sticky' | 'text' | 'table';
  content: string;
  x: number;
  y: number;
  color: string;
}

interface Whiteboard {
  id: string;
  title: string;
  content: Note[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

const COLORS = [
  { name: 'Blue', hex: '#0088FF' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Gold', hex: '#F59E0B' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Emerald', hex: '#10B981' },
];

const TEMPLATES = [
  {
    name: 'FODA Estratégico',
    description: 'Análisis de Fortalezas, Oportunidades, Debilidades y Amenazas.',
    content: [
      { id: 'f1', type: 'text', content: 'FORTALEZAS', x: 100, y: 100, color: '#10B981' },
      { id: 'f2', type: 'sticky', content: 'Idea...', x: 100, y: 150, color: '#10B981' },
      { id: 'o1', type: 'text', content: 'OPORTUNIDADES', x: 500, y: 100, color: '#0088FF' },
      { id: 'o2', type: 'sticky', content: 'Idea...', x: 500, y: 150, color: '#0088FF' },
      { id: 'd1', type: 'text', content: 'DEBILIDADES', x: 100, y: 400, color: '#F59E0B' },
      { id: 'd2', type: 'sticky', content: 'Idea...', x: 100, y: 450, color: '#F59E0B' },
      { id: 'a1', type: 'text', content: 'AMENAZAS', x: 500, y: 400, color: '#EC4899' },
      { id: 'a2', type: 'sticky', content: 'Idea...', x: 500, y: 450, color: '#EC4899' },
    ]
  },
  {
    name: 'Plan de Evento',
    description: 'Estructura básica para la coordinación de un evento ACS.',
    content: [
      { id: 'e1', type: 'text', content: 'OBJETIVO CENTRAL', x: 300, y: 50, color: '#0088FF' },
      { id: 'e2', type: 'sticky', content: '¿Qué queremos lograr?', x: 300, y: 100, color: '#0088FF' },
      { id: 'e3', type: 'text', content: 'LOGÍSTICA', x: 50, y: 250, color: '#8B5CF6' },
      { id: 'e4', type: 'text', content: 'COMUNICACIÓN', x: 550, y: 250, color: '#EC4899' },
      { id: 'e5', type: 'sticky', content: 'Flyer...', x: 550, y: 300, color: '#EC4899' },
    ]
  }
];

export const WhiteboardView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [activeBoard, setActiveBoard] = useState<Whiteboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNeuralizing, setIsNeuralizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  
  // Viewport State
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvas = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whiteboards')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setBoards(data || []);
    } catch (err) {
      console.error('Error fetching boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!newBoardTitle.trim()) {
      showToast({ type: 'warning', title: 'Atención', message: 'Debes ingresar un título para la pizarra.' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whiteboards')
        .insert([{
          title: newBoardTitle,
          content: [],
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      setBoards([data, ...boards]);
      setIsCreateModalOpen(false);
      setNewBoardTitle('');
      openBoard(data);
      showToast({ type: 'success', title: 'Sistema Actualizado', message: 'Nueva pizarra creada con éxito.' });
    } catch (err) {
      console.error('Error creating board:', err);
      showToast({ type: 'error', title: 'Error de Sistema', message: 'No se pudo crear la pizarra.' });
    }
  };

  const openBoard = (board: Whiteboard) => {
    setActiveBoard(board);
    setView('editor');
  };

  const saveBoard = async () => {
    if (!activeBoard) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whiteboards')
        .update({ 
          content: activeBoard.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeBoard.id);
      
      if (error) throw error;
      fetchBoards();
      showToast({ type: 'success', title: 'Sincronización', message: 'Pizarra guardada correctamente en el núcleo.' });
    } catch (err) {
      console.error('Error saving board:', err);
      showToast({ type: 'error', title: 'Error de Sincronización', message: 'No se pudieron guardar los cambios.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm(
      'ELIMINAR PIZARRA',
      '¿Estás seguro de que deseas eliminar permanentemente esta planificación estratégica? Esta acción no se puede deshacer.',
      { isDestructive: true, confirmText: 'Eliminar Pizarra', cancelText: 'Mantener' }
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('whiteboards').delete().eq('id', id);
      if (error) throw error;
      setBoards(boards.filter(b => b.id !== id));
      showToast({ type: 'info', title: 'Sistema Purificado', message: 'La pizarra ha sido eliminada del registro.' });
    } catch (err) {
      console.error('Error deleting board:', err);
      showToast({ type: 'error', title: 'Error de Eliminación', message: 'No se pudo purgar la pizarra.' });
    }
  };

  // Editor Actions
  const addNote = (type: 'sticky' | 'text' | 'table') => {
    if (!activeBoard) return;
    const newNote: Note = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Nuevo Texto' : 'Nueva Idea...',
      x: Math.random() * 200 + 100,
      y: Math.random() * 200 + 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)].hex,
    };
    setActiveBoard({ ...activeBoard, content: [...activeBoard.content, newNote] });
  };

  const updateNotePosition = (id: string, x: number, y: number) => {
    if (!activeBoard) return;
    setActiveBoard({
      ...activeBoard,
      content: activeBoard.content.map(n => n.id === id ? { ...n, x, y } : n)
    });
  };

  const updateNoteContent = (id: string, content: string) => {
    if (!activeBoard) return;
    setActiveBoard({
      ...activeBoard,
      content: activeBoard.content.map(n => n.id === id ? { ...n, content } : n)
    });
  };

  const removeNote = (id: string) => {
    if (!activeBoard) return;
    setActiveBoard({
      ...activeBoard,
      content: activeBoard.content.filter(n => n.id !== id)
    });
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    if (!activeBoard) return;
    const newContent = template.content.map(n => ({
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: n.x + (Math.random() * 20), // Slight offset
      y: n.y + (Math.random() * 20)
    })) as Note[];
    
    setActiveBoard({
      ...activeBoard,
      content: [...activeBoard.content, ...newContent]
    });
    showToast({ type: 'success', title: 'Protocolo Cargado', message: `Plantilla ${template.name} aplicada al lienzo.` });
  };

  const handleNeuralize = async () => {
    if (!activeBoard || activeBoard.content.length === 0) {
      showToast({ type: 'warning', title: 'Lienzo Vacío', message: 'Agrega algunas ideas antes de neuralizar.' });
      return;
    }

    setIsNeuralizing(true);
    try {
      const notesContent = activeBoard.content.map(n => n.content).join('\n- ');
      const prompt = `
        Actúa como el orquestador táctico HOYR. Analiza estas notas de una pizarra neural estratégica y extrae tareas concretas y accionables.
        
        Notas del Lienzo:
        - ${notesContent}
        
        Tu objetivo es identificar las acciones necesarias para llevar a cabo lo planeado.
        Debes devolver un JSON con una lista de tareas para el sistema SGR-ACS.
        Cada tarea debe tener: title (máximo 50 caracteres, tono ejecutivo), description (qué se debe hacer exactamente), priority ('Baja', 'Media', 'Alta').
        
        Formato de respuesta estrictamente JSON:
        {
          "tasks": [
            { "title": "Nombre Tarea", "description": "Descripción detallada", "priority": "Media" }
          ],
          "summary": "Breve resumen ejecutivo de la visión analizada"
        }
      `;

      const aiResponse = await generateContent(prompt);
      const data = extractJSON(aiResponse);

      if (data.tasks && data.tasks.length > 0) {
        // Insertar tareas en la base de datos
        const tasksToInsert = data.tasks.map((t: any) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: 'Pendiente',
          created_by: user?.id,
          assigned_to: user?.id, // Por defecto al Director que neuraliza
          due_date: new Date(Date.now() + 86400000 * 3).toISOString() // +3 días para ejecución
        }));

        const { error } = await supabase.from('tasks').insert(tasksToInsert);
        if (error) throw error;

        showToast({ 
          type: 'success', 
          title: 'IA: Extracción Exitosa', 
          message: `Se han generado ${data.tasks.length} tareas reales a partir de tus ideas.` 
        });
      } else {
        showToast({ 
          type: 'info', 
          title: 'Visión Estratégica', 
          message: data.summary || 'El lienzo ha sido analizado pero no se detectaron tareas pendientes.' 
        });
      }
    } catch (err) {
      console.error('Error neuralizing:', err);
      showToast({ type: 'error', title: 'Fallo Cognitivo', message: 'No se pudo completar el análisis neural en este momento.' });
    } finally {
      setIsNeuralizing(false);
    }
  };

  const resetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
    showToast({ type: 'info', title: 'Vista Re-centrada', message: 'Lienzo restablecido a coordenadas de origen.' });
  };

  // Canvas Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (view !== 'editor') return;
    const delta = e.deltaY;
    const zoomStep = 0.1;
    const newZoom = delta > 0 
      ? Math.max(0.1, viewport.zoom - zoomStep) 
      : Math.min(3, viewport.zoom + zoomStep);
    
    setViewport(prev => ({ ...prev, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left click
      isDraggingCanvas.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    setViewport(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingCanvas.current = false;
  };

  if (view === 'list') {
    return (
      <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6">
        <div className="space-y-6">
          {/* ═══ DESKTOP HEADER ═══ */}
          <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                  <LayoutGrid className="w-6 h-6 text-exec-blue" />
                </div>
                <span>Pizarra <span className="text-exec-blue">Neural</span></span>
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1 italic">Planificación estratégica de alto nivel y lluvia de ideas tácticas.</p>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Pizarra
            </button>
          </div>

          {/* ═══ MOBILE HEADER ═══ */}
          <div className="block md:hidden bg-black">
            <section className="flex justify-between items-center bg-[#0A0A0A] border border-[#262626] rounded-none p-4 shadow-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-exec-blue" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white uppercase tracking-tight leading-none">Pizarra <span className="text-exec-blue">Neural</span></h1>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold mt-1">SGR-ACS PROTOCOL</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-10 h-10 flex items-center justify-center bg-exec-blue rounded-none text-white shadow-lg active:scale-95 transition-all shadow-exec-blue/20"
              >
                <Plus size={20} />
              </button>
            </section>
          </div>

          {/* ═══ CREATE MODAL ═══ */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-sm border border-exec-border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Nueva Pizarra Neural</h3>
                    <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-exec-blue uppercase tracking-widest mb-2 block">Título de Planificación</label>
                      <input 
                        autoFocus
                        type="text"
                        className="exec-input w-full"
                        placeholder="EJ. ESTRATEGIA Q3 2024..."
                        value={newBoardTitle}
                        onChange={(e) => setNewBoardTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createBoard()}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setIsCreateModalOpen(false)}
                        className="flex-1 px-4 py-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white border border-exec-border rounded-none text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={createBoard}
                        className="flex-1 px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-black uppercase tracking-widest shadow-lg shadow-exec-blue/20 transition-all"
                      >
                        Crear Pizarra
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ FILTERS BAR ═══ */}
          <div className="flex items-center gap-3">
            <div className="relative group max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-exec-blue transition-colors w-4 h-4" />
              <input 
                type="text" 
                placeholder="BUSCAR PLANIFICACIÓN..."
                className="exec-input pl-9 pr-4 py-2 w-full text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="h-6 w-px bg-exec-border mx-2"></div>
            
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-black tracking-widest">
              <span className="text-exec-blue">{boards.length}</span> Entidades
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-exec-blue"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {boards.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase())).map(board => (
                <motion.div
                  key={board.id}
                  whileHover={{ y: -4 }}
                  onClick={() => openBoard(board)}
                  className="group relative bg-[#0A0A0A] border border-exec-border/60 p-5 cursor-pointer hover:border-exec-blue/40 transition-all flex flex-col justify-between min-h-[180px] rounded-none shadow-xl hover:shadow-exec-blue/5"
                >
                  <div className="absolute top-3 right-3 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={(e) => deleteBoard(board.id, e)} 
                      className="w-8 h-8 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-none"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div>
                    <div className="w-10 h-10 bg-[#050505] border border-exec-border group-hover:border-exec-blue/30 flex items-center justify-center mb-5 transition-colors">
                      <LayoutGrid size={18} className="text-gray-600 group-hover:text-exec-blue transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight leading-tight line-clamp-2 uppercase group-hover:text-exec-blue transition-colors">{board.title}</h3>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-exec-border/30 pt-4">
                    <div className="flex items-center gap-2 text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                      <Clock size={11} className="text-exec-blue/40" />
                      {new Date(board.updated_at).toLocaleDateString()}
                    </div>
                    <div className="px-2 py-0.5 bg-exec-blue/5 border border-exec-blue/10 text-[9px] text-exec-blue font-black uppercase tracking-widest">
                      {board.content.length} ENTIDADES
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // EDITOR VIEW
  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-[calc(100vh-120px)] bg-[#050505] rounded-none border border-exec-border overflow-hidden select-none"
    >
      {/* Background Grid - Parallax effect */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, 
          backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`
        }} 
      />

      {/* Editor Header */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-6">
        <button 
          onClick={() => { setView('list'); fetchBoards(); }}
          className="w-10 h-10 bg-[#111] border border-exec-border flex items-center justify-center text-gray-400 hover:text-white hover:bg-exec-blue hover:border-exec-blue transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter uppercase leading-none">
            {activeBoard?.title}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-exec-blue/10 border border-exec-blue/30 rounded-none">
              <Sparkles className="w-3 h-3 text-exec-blue" />
              <span className="text-[9px] font-black text-exec-blue uppercase tracking-widest">Neural Sync Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#141414] border border-exec-border/50 rounded-none">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                Realtime
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3 p-2 bg-[#111]/80 backdrop-blur-xl border border-exec-border rounded-sm shadow-2xl">
        <button onClick={() => addNote('sticky')} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Nota Adhesiva"><StickyNote size={20} /></button>
        <button onClick={() => addNote('text')} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Texto"><Type size={20} /></button>
        <button onClick={() => addNote('table')} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Tabla de Datos"><Table size={20} /></button>
        
        <div className="h-px bg-exec-border mx-2" />
        
        <div className="relative group/templates">
          <button className="p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Protocolos ACS">
            <LayoutGrid size={20} />
          </button>
          <div className="absolute left-full ml-2 top-0 bg-[#0A0A0A] border border-exec-border w-48 hidden group-hover/templates:block shadow-2xl p-1 animate-in slide-in-from-left-1 duration-200">
            <p className="text-[9px] font-black text-exec-blue uppercase tracking-widest p-2 border-b border-exec-border mb-1">Protocolos ACS</p>
            {TEMPLATES.map(t => (
              <button 
                key={t.name}
                onClick={() => applyTemplate(t)}
                className="w-full text-left p-2 hover:bg-white/5 text-[10px] text-gray-400 hover:text-white transition-all flex flex-col gap-0.5"
              >
                <span className="font-bold uppercase tracking-tight">{t.name}</span>
                <span className="text-[8px] text-gray-600 lowercase line-clamp-1 italic">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-exec-border mx-2" />
        <button onClick={handleNeuralize} className={`p-3 rounded-none transition-all ${isNeuralizing ? 'bg-purple-600 animate-pulse' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'}`} title="Neuralizar con HOYR"><Sparkles size={20} /></button>
      </div>

      {/* Save Button */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <button 
          onClick={saveBoard}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${saving ? 'bg-gray-800 text-gray-500' : 'bg-white text-black hover:bg-exec-blue hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(0,136,255,0.4)]'}`}
        >
          {saving ? 'Guardando...' : <><Save size={14} /> Guardar Pizarra</>}
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        className="absolute inset-0 p-0 cursor-crosshair"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          transition: isDraggingCanvas.current ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <AnimatePresence>
          {activeBoard?.content.map((note) => (
            <motion.div
              key={note.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              drag
              dragMomentum={false}
              onDragEnd={(_, info) => updateNotePosition(note.id, note.x + info.delta.x, note.y + info.delta.y)}
              style={{ x: note.x, y: note.y, position: 'absolute', zIndex: 10 }}
              className="cursor-grab active:cursor-grabbing group"
            >
              {note.type === 'sticky' ? (
                <div 
                  className="w-56 p-5 min-h-[140px] shadow-2xl transition-all hover:brightness-110 flex flex-col justify-between border relative group overflow-hidden"
                  style={{ 
                    backgroundColor: `${note.color}08`, 
                    borderColor: `${note.color}25`, 
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 10px 30px -10px ${note.color}15`
                  }}
                >
                  {/* Decorative corner accent */}
                  <div className="absolute top-0 right-0 w-8 h-8 opacity-20 pointer-events-none" style={{ background: `linear-gradient(225deg, ${note.color} 50%, transparent 50%)` }} />
                  
                  <textarea
                    className="bg-transparent border-none outline-none text-white text-sm font-medium resize-none w-full h-full scrollbar-hide placeholder-white/20"
                    value={note.content}
                    onChange={(e) => updateNoteContent(note.id, e.target.value)}
                    placeholder="Escribe algo..."
                  />
                  <div className="flex justify-between items-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 duration-200">
                    <button onClick={() => removeNote(note.id)} className="text-white/40 hover:text-red-500 transition-colors p-1"><Trash2 size={12} /></button>
                    <div className="flex gap-1.5 p-1 bg-black/40 rounded-full backdrop-blur-sm">
                       {COLORS.map(c => (
                         <button key={c.hex} onClick={() => {
                           if (activeBoard) {
                             setActiveBoard({ ...activeBoard, content: activeBoard.content.map(n => n.id === note.id ? { ...n, color: c.hex } : n) });
                           }
                         }} className="w-2.5 h-2.5 rounded-full hover:scale-125 transition-transform" style={{ backgroundColor: c.hex }} />
                       ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2">
                  <input 
                    type="text"
                    className="bg-transparent border-none outline-none text-3xl font-black text-white tracking-tighter uppercase focus:ring-0 w-auto"
                    value={note.content}
                    onChange={(e) => updateNoteContent(note.id, e.target.value)}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isNeuralizing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-exec-blue/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
             <div className="text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 border-t-2 border-exec-blue rounded-full mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase italic">IA Analizando Lienzo...</h3>
             </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
        <div className="flex flex-col bg-[#111]/90 backdrop-blur-md border border-exec-border overflow-hidden shadow-2xl">
          <button onClick={() => setViewport(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.1) }))} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Zoom In"><Plus size={18} /></button>
          <div className="h-px bg-exec-border" />
          <button onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.1, v.zoom - 0.1) }))} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Zoom Out"><Minus size={18} /></button>
          <div className="h-px bg-exec-border" />
          <button onClick={resetView} className="p-3 text-exec-blue hover:bg-exec-blue/10 transition-all font-mono text-[10px] font-bold">
            {Math.round(viewport.zoom * 100)}%
          </button>
        </div>
      </div>

      {/* Mini-map */}
      <div className="absolute bottom-6 left-6 z-30 w-40 h-24 bg-black/80 backdrop-blur-xl border border-exec-border overflow-hidden shadow-2xl group/minimap pointer-events-none">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '10px 10px' }} />
        <p className="absolute top-1 left-2 text-[8px] font-black text-exec-blue uppercase tracking-tighter opacity-50">Neural Map</p>
        
        {/* Render simplified notes in minimap */}
        <div className="relative w-full h-full transform scale-[0.05] origin-top-left p-2">
          {activeBoard?.content.map(note => (
            <div 
              key={note.id} 
              className="absolute rounded-sm border border-white/20"
              style={{ 
                left: note.x, 
                top: note.y, 
                width: 150, 
                height: 100, 
                backgroundColor: note.color 
              }} 
            />
          ))}
          {/* Current Viewport indicator */}
          <div 
            className="absolute border-4 border-exec-blue bg-exec-blue/10 transition-all"
            style={{
              left: -viewport.x / viewport.zoom,
              top: -viewport.y / viewport.zoom,
              width: 1200, // Approximate viewport size
              height: 800,
            }}
          />
        </div>
      </div>
    </div>
  );
};
