import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  Plus, Edit3, Trash2, X, Loader2, AlertTriangle, Search,
  MapPin, Users, Calendar, Filter, Activity, TrendingUp,
  ShieldAlert, Globe
} from 'lucide-react';

interface SocialConflict {
  id: string;
  title: string;
  description: string;
  type: string;
  intensity: string;
  province: string;
  actors: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
}

const CONFLICT_TYPES = [
  'Socioambiental',
  'Laboral',
  'Civil',
  'Gobernanza',
  'Otro'
];

const INTENSITY_LEVELS = ['Bajo', 'Medio', 'Alto', 'Crítico'];

const CAJAMARCA_PROVINCES = [
  'Cajamarca', 'Jaén', 'Chota', 'Cutervo', 'Hualgayoc',
  'San Ignacio', 'Celendín', 'Bambamarca', 'Contumaza',
  'San Marcos', 'San Miguel', 'San Pablo', 'Santa Cruz'
];

const intensityConfig = {
  'Crítico': {
    badge: 'text-red-400 bg-red-950/30 border border-red-900/30',
    dot: 'bg-red-500 animate-pulse',
    text: 'text-red-400',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]'
  },
  'Alto': {
    badge: 'text-orange-400 bg-orange-950/30 border border-orange-900/30',
    dot: 'bg-orange-400',
    text: 'text-orange-400',
    glow: ''
  },
  'Medio': {
    badge: 'text-yellow-400 bg-yellow-950/30 border border-yellow-900/30',
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    glow: ''
  },
  'Bajo': {
    badge: 'text-cyan-400 bg-cyan-950/20 border border-cyan-900/20',
    dot: 'bg-cyan-400',
    text: 'text-cyan-400',
    glow: ''
  }
};

const typeIcons: Record<string, string> = {
  'Socioambiental': 'eco',
  'Laboral': 'work',
  'Civil': 'gavel',
  'Gobernanza': 'account_balance',
  'Otro': 'help_outline'
};

const emptyForm = {
  title: '',
  description: '',
  type: 'Socioambiental',
  intensity: 'Medio',
  province: 'Cajamarca',
  actors: '',
  latitude: '',
  longitude: '',
  status: 'published'
};

export const ConflictsView: React.FC = () => {
  const { showToast } = useToast();
  const [conflicts, setConflicts] = useState<SocialConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConflict, setEditingConflict] = useState<SocialConflict | null>(null);
  const [conflictToDelete, setConflictToDelete] = useState<SocialConflict | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterIntensity, setFilterIntensity] = useState('all');

  useEffect(() => { fetchConflicts(); }, []);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_conflicts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setConflicts(data || []);
    } catch (e) {
      console.error('Error loading conflicts:', e);
      showToast({ message: 'Error al cargar el registro de conflictos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingConflict(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (conflict: SocialConflict) => {
    setEditingConflict(conflict);
    setForm({
      title: conflict.title,
      description: conflict.description || '',
      type: conflict.type,
      intensity: conflict.intensity,
      province: conflict.province,
      actors: conflict.actors || '',
      latitude: conflict.latitude !== null ? String(conflict.latitude) : '',
      longitude: conflict.longitude !== null ? String(conflict.longitude) : '',
      status: conflict.status
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.province) {
      showToast({ message: 'Título y provincia son campos requeridos.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        intensity: form.intensity,
        province: form.province,
        actors: form.actors.trim() || null,
        latitude: form.latitude !== '' ? parseFloat(form.latitude) : null,
        longitude: form.longitude !== '' ? parseFloat(form.longitude) : null,
        status: form.status,
        updated_at: new Date().toISOString()
      };

      if (editingConflict) {
        const { error } = await supabase
          .from('social_conflicts')
          .update(payload)
          .eq('id', editingConflict.id);
        if (error) throw error;
        showToast({ message: 'Conflicto actualizado correctamente.', type: 'success' });
      } else {
        const { error } = await supabase
          .from('social_conflicts')
          .insert(payload);
        if (error) throw error;
        showToast({ message: '¡Conflicto registrado! Aparecerá en el Observatorio.', type: 'success' });
      }
      setShowModal(false);
      fetchConflicts();
    } catch (e: any) {
      console.error('Error saving conflict:', e);
      showToast({ message: e.message || 'Error al guardar el registro.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!conflictToDelete) return;
    try {
      const { error } = await supabase
        .from('social_conflicts')
        .delete()
        .eq('id', conflictToDelete.id);
      if (error) throw error;
      showToast({ message: 'Registro eliminado del sistema.', type: 'success' });
      setConflictToDelete(null);
      fetchConflicts();
    } catch (e: any) {
      showToast({ message: e.message || 'Error al eliminar.', type: 'error' });
    }
  };

  // Computed metrics
  const total = conflicts.length;
  const critical = conflicts.filter(c => c.intensity === 'Crítico').length;
  const high = conflicts.filter(c => c.intensity === 'Alto').length;
  const activeProvinces = new Set(conflicts.map(c => c.province)).size;

  const filtered = conflicts.filter(c => {
    const matchSearch = !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.actors || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || c.type === filterType;
    const matchIntensity = filterIntensity === 'all' || c.intensity === filterIntensity;
    return matchSearch && matchType && matchIntensity;
  });

  const cfg = (intensity: string) =>
    intensityConfig[intensity as keyof typeof intensityConfig] || intensityConfig['Bajo'];

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-red-500/10 rounded-none border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <span>Registro de <span className="text-red-400">Conflictos</span> Sociales</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Ingesta de eventos sociales, conflictos territoriales y tensiones coyunturales hacia el Observatorio.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Evento
        </button>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] group hover:border-red-900/60 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Total Registros</h3>
            <span className="material-symbols-outlined notranslate text-red-400 text-xl" translate="no">crisis_alert</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{total}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">database</span>
              <span className="font-medium uppercase text-[10px]">en sistema</span>
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] group hover:border-red-500/40 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Críticos</h3>
            <span className="material-symbols-outlined notranslate text-red-500 text-xl animate-pulse" translate="no">warning</span>
          </div>
          <div>
            <p className="text-3xl font-light text-red-400">{critical}</p>
            <div className="flex items-center gap-1 text-xs text-red-500/70 mt-1">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">bolt</span>
              <span className="font-medium uppercase text-[10px]">atención inmediata</span>
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] group hover:border-orange-400/40 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Alta Intensidad</h3>
            <span className="material-symbols-outlined notranslate text-orange-400 text-xl" translate="no">trending_up</span>
          </div>
          <div>
            <p className="text-3xl font-light text-orange-400">{high}</p>
            <div className="flex items-center gap-1 text-xs text-orange-400/70 mt-1">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">monitor_heart</span>
              <span className="font-medium uppercase text-[10px]">en seguimiento</span>
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] group hover:border-exec-blue/40 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Provincias</h3>
            <span className="material-symbols-outlined notranslate text-exec-blue text-xl" translate="no">map</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{activeProvinces}</p>
            <div className="flex items-center gap-1 text-xs text-exec-blue/70 mt-1">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">location_on</span>
              <span className="font-medium uppercase text-[10px]">territorios activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FILTROS Y BÚSQUEDA ═══ */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por título, provincia o actores..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-exec-border text-white text-xs pl-9 pr-4 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-500 hidden md:block" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] font-bold uppercase px-3 py-2.5 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            {CONFLICT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterIntensity}
            onChange={e => setFilterIntensity(e.target.value)}
            className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] font-bold uppercase px-3 py-2.5 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer"
          >
            <option value="all">Toda intensidad</option>
            {INTENSITY_LEVELS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* ═══ LISTA DE CONFLICTOS ═══ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-exec-border border-t-red-500"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Cargando registro de conflictos...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-12 bg-[#0A0A0A] border border-exec-border">
          <span className="material-symbols-outlined notranslate text-gray-700 text-5xl mb-3 block" translate="no">crisis_alert</span>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            {conflicts.length === 0 ? 'Sin eventos registrados' : 'Sin resultados para los filtros aplicados'}
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-600 mt-1 max-w-sm mx-auto">
            {conflicts.length === 0
              ? 'Registra el primer conflicto o evento social para alimentar el Observatorio Territorial.'
              : 'Ajusta los filtros o el término de búsqueda.'}
          </p>
          {conflicts.length === 0 && (
            <button
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none"
            >
              <Plus className="w-4 h-4" /> Registrar primer evento
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(conflict => {
            const config = cfg(conflict.intensity);
            return (
              <div
                key={conflict.id}
                className={`exec-card bg-[#0A0A0A] p-4 flex flex-col md:flex-row md:items-start gap-4 hover:border-gray-700 transition-all ${config.glow}`}
              >
                {/* Intensity indicator bar */}
                <div className="hidden md:flex flex-col items-center gap-2 pt-1">
                  <div className={`h-3 w-3 rounded-full ${config.dot}`}></div>
                  <div className="flex-1 w-px bg-exec-border min-h-[40px]"></div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-none tracking-widest ${config.badge}`}>
                      {conflict.intensity}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-mono text-gray-500 uppercase">
                      <span className="material-symbols-outlined notranslate text-[12px] text-gray-600" translate="no">
                        {typeIcons[conflict.type] || 'help_outline'}
                      </span>
                      {conflict.type}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-mono text-gray-500 uppercase">
                      <MapPin size={10} className="text-gray-600" />
                      {conflict.province}
                    </span>
                    {conflict.latitude && conflict.longitude && (
                      <span className="text-[9px] font-mono text-exec-blue/60 uppercase flex items-center gap-1">
                        <Globe size={9} />
                        GPS
                      </span>
                    )}
                    {conflict.status === 'draft' && (
                      <span className="text-[9px] font-mono text-gray-600 bg-gray-900 border border-gray-800 px-1.5 py-0.5 uppercase">
                        Borrador
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-white uppercase tracking-wide leading-tight mb-1">
                    {conflict.title}
                  </h3>
                  {conflict.description && (
                    <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{conflict.description}</p>
                  )}
                  {conflict.actors && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Users size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-500 font-mono truncate">{conflict.actors}</span>
                    </div>
                  )}
                </div>

                {/* Metadata + Actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 md:gap-4 min-w-fit">
                  <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                    {new Date(conflict.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenEdit(conflict)}
                      className="flex items-center gap-1 text-gray-500 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Edit3 size={12} />
                      <span className="hidden md:inline">Editar</span>
                    </button>
                    <div className="h-3 w-px bg-exec-border"></div>
                    <button
                      onClick={() => setConflictToDelete(conflict)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-400 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span className="hidden md:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL CREAR / EDITAR ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-exec-border">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                {editingConflict ? 'Editar Registro de Conflicto' : 'Registrar Nuevo Evento Social'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5 text-left">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                  Título del Evento <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Protesta minera en Hualgayoc — Bloqueo carretera"
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue"
                />
              </div>

              {/* Type + Intensity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Tipología <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer"
                  >
                    {CONFLICT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Intensidad <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.intensity}
                    onChange={e => setForm(p => ({ ...p, intensity: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer"
                  >
                    {INTENSITY_LEVELS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              {/* Province + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Provincia <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.province}
                    onChange={e => setForm(p => ({ ...p, province: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer"
                  >
                    {CAJAMARCA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer"
                  >
                    <option value="published">Publicado (visible en Observatorio)</option>
                    <option value="draft">Borrador (solo admin)</option>
                  </select>
                </div>
              </div>

              {/* Actors */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                  Actores Involucrados
                  <span className="text-gray-500 normal-case font-normal ml-2">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.actors}
                  onChange={e => setForm(p => ({ ...p, actors: e.target.value }))}
                  placeholder="Ej: Comunidad campesina, empresa minera, MINEM, Defensoría del Pueblo"
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                  Descripción y Contextualización
                  <span className="text-gray-500 normal-case font-normal ml-2">(opcional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Contexto del evento, detonantes, estado actual de las negociaciones..."
                  rows={3}
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue resize-none"
                />
              </div>

              {/* GPS Coords — OPTIONAL */}
              <div className="space-y-2 border border-exec-border/50 bg-black/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={13} className="text-exec-blue" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Coordenadas GPS
                    <span className="text-gray-500 normal-case font-normal ml-2">— opcional. Si no se ingresa, el pin aparecerá por provincia.</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latitud</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={form.latitude}
                      onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                      placeholder="-7.1638"
                      className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-700 focus:outline-none focus:border-exec-blue"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Longitud</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={form.longitude}
                      onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                      placeholder="-78.5167"
                      className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-700 focus:outline-none focus:border-exec-blue"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-gray-600 font-mono">
                  HINT: Cajamarca → -7.1638, -78.5167 | Hualgayoc → -6.7738, -78.6128 | Jaén → -5.7069, -78.8083
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-exec-border/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-exec-border text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-none transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-55 text-white text-[11px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-none transition-colors cursor-pointer shadow-lg shadow-red-600/20"
                >
                  {isSaving && <Loader2 size={12} className="animate-spin" />}
                  <span>{editingConflict ? 'Guardar Cambios' : 'Registrar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ CONFIRM DELETE ═══ */}
      {conflictToDelete && (
        <ConfirmModal
          isOpen={!!conflictToDelete}
          title="¿Eliminar registro?"
          message={`El evento "${conflictToDelete.title}" será eliminado permanentemente del sistema y desaparecerá del Observatorio Territorial.`}
          confirmText="Eliminar permanentemente"
          cancelText="Cancelar"
          onConfirm={handleDelete}
          onCancel={() => setConflictToDelete(null)}
        />
      )}
    </div>
  );
};
