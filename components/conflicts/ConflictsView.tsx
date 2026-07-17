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
  
  // Tab selector
  const [activeTab, setActiveTab] = useState<'conflicts' | 'alerts'>('conflicts');

  // --- CONFLICTS STATES ---
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

  // --- ALERTS STATES ---
  const [alertsSubTab, setAlertsSubTab] = useState<'pending' | 'approved'>('pending');
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: '',
    description: '',
    province: 'Cajamarca',
    type: 'Bajo' as 'Bajo' | 'Medio' | 'Alto',
    latitude: '',
    longitude: ''
  });
  const [uploadingAlert, setUploadingAlert] = useState(false);
  const [showConfirmDeleteAlert, setShowConfirmDeleteAlert] = useState<string | null>(null);
  const [showConfirmApproveAlert, setShowConfirmApproveAlert] = useState<string | null>(null);

  // --- ALERTS LOGIC ---
  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlertsList(data || []);
    } catch (e) {
      console.error('Error loading alerts:', e);
      showToast({ message: 'Error al consultar alertas ciudadanas.', type: 'error' });
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!alertForm.title.trim() || !alertForm.description.trim()) {
      showToast({ message: 'Por favor complete título y descripción.', type: 'error' });
      return;
    }
    setUploadingAlert(true);
    try {
      const payload: any = {
        title: alertForm.title.trim(),
        description: alertForm.description.trim(),
        province: alertForm.province,
        type: alertForm.type,
        status: 'aprobado'
      };

      if (alertForm.latitude && alertForm.longitude) {
        payload.latitude = parseFloat(alertForm.latitude);
        payload.longitude = parseFloat(alertForm.longitude);
      }

      const { error } = await supabase.from('alerts').insert(payload);
      if (error) throw error;

      showToast({ message: '¡Alerta socioambiental activada!', type: 'success' });
      setAlertForm({
        title: '',
        description: '',
        province: 'Cajamarca',
        type: 'Bajo',
        latitude: '',
        longitude: ''
      });
      setShowCreateAlert(false);
      loadAlerts();
    } catch (e: any) {
      console.error('Error al registrar alerta:', e);
      showToast({ message: e.message || 'Error al guardar alerta', type: 'error' });
    } finally {
      setUploadingAlert(false);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase.from('alerts').delete().eq('id', id);
      if (error) throw error;
      showToast({ message: 'Alerta eliminada correctamente.', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al borrar alerta:', e);
      showToast({ message: e.message || 'Error al borrar', type: 'error' });
    }
  };

  const approveAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'aprobado' })
        .eq('id', id);
      if (error) throw error;
      showToast({ message: 'Alerta ciudadana aprobada y publicada.', type: 'success' });
      loadAlerts();
    } catch (e: any) {
      console.error('Error al aprobar alerta:', e);
      showToast({ message: e.message || 'Error al aprobar', type: 'error' });
    }
  };

  // --- CONFLICTS EFFECTS & TRIGGERS ---
  useEffect(() => { fetchConflicts(); }, []);

  useEffect(() => {
    if (activeTab === 'alerts') {
      loadAlerts();
    }
  }, [activeTab]);

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
            <span>Monitoreo <span className="text-red-400">Territorial</span> e Incidentes</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Ingesta de conflictos sociales, incidentes socioambientales y reportes de la ciudadanía de Cajamarca.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'conflicts' && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Evento
            </button>
          )}

          {activeTab === 'alerts' && (
            <button
              onClick={() => setShowCreateAlert(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              Activar Alerta
            </button>
          )}
        </div>
      </div>

      {/* ═══ TABS SELECTOR ═══ */}
      <div className="flex items-center gap-1 bg-[#0A0A0A] border border-zinc-900 rounded-none p-1 overflow-x-auto whitespace-nowrap scroll-hide w-full lg:w-auto">
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap cursor-pointer ${
            activeTab === 'conflicts' ? 'bg-red-900 text-white shadow-lg shadow-red-900/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert size={14} />
          <span>Conflictos Sociales</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap cursor-pointer ${
            activeTab === 'alerts' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Alertas Ciudadanas</span>
        </button>
      </div>

      {/* ═══ TAB 1: CONFLICTOS ═══ */}
      {activeTab === 'conflicts' && (
        <div className="space-y-6">
          {/* METRIC CARDS */}
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

          {/* FILTROS Y BÚSQUEDA */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-550" />
              <input
                type="text"
                placeholder="Buscar por título, provincia o actores..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-exec-border text-white text-xs pl-9 pr-4 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-550 hidden md:block" />
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

          {/* LISTA DE CONFLICTOS */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin h-8 w-8 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Cargando registro de conflictos...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 bg-[#0A0A0A] border border-exec-border">
              <AlertTriangle className="text-gray-700 text-4xl mb-3 mx-auto" />
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
                  className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none cursor-pointer"
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
        </div>
      )}

      {/* ═══ TAB 2: ALERTAS CIUDADANAS ═══ */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Sub-navigation for Alerts */}
          <div className="flex border-b border-zinc-900">
            <button
              onClick={() => setAlertsSubTab('pending')}
              className={`px-4 py-2 text-[10px] font-bold font-mono uppercase border-b-2 transition-all cursor-pointer ${
                alertsSubTab === 'pending' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              Reportes Ciudadanos ({alertsList.filter(a => a.status === 'pendiente').length})
            </button>
            <button
              onClick={() => setAlertsSubTab('approved')}
              className={`px-4 py-2 text-[10px] font-bold font-mono uppercase border-b-2 transition-all cursor-pointer ${
                alertsSubTab === 'approved' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              Alertas Publicadas ({alertsList.filter(a => a.status === 'aprobado').length})
            </button>
          </div>

          {loadingAlerts ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {alertsSubTab === 'pending' && (
                <div className="space-y-4">
                  {alertsList.filter(a => a.status === 'pendiente').length === 0 ? (
                    <div className="text-center p-12 bg-[#0A0A0A] border border-zinc-900 font-mono text-xs text-gray-500">
                      NO HAY REPORTES CIUDADANOS PENDIENTES DE MODERACIÓN.
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {alertsList.filter(a => a.status === 'pendiente').map((al) => (
                        <div key={al.id} className="bg-[#0A0A0A] border border-zinc-900 hover:border-zinc-800 p-4 flex flex-col justify-between gap-3 text-left transition-colors">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase font-bold text-gray-400">{al.province}</span>
                              <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase ${
                                al.type === 'Bajo' ? 'bg-green-955 text-green-400 border border-green-900/30' :
                                al.type === 'Medio' ? 'bg-yellow-955 text-yellow-400 border border-yellow-900/30' :
                                'bg-red-955 text-red-400 border border-red-900/30'
                              }`}>
                                Prioridad {al.type}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white uppercase leading-snug">{al.title}</h4>
                            <p className="text-[10.5px] text-gray-400 leading-relaxed font-sans">{al.description}</p>
                          </div>

                          <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-[9px] font-mono">
                            <span className="text-gray-500">Reportado: {new Date(al.created_at).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowConfirmApproveAlert(al.id)}
                                className="text-green-400 hover:text-white font-bold cursor-pointer transition-colors"
                              >
                                Aprobar
                              </button>
                              <span className="text-gray-700">|</span>
                              <button
                                onClick={() => setShowConfirmDeleteAlert(al.id)}
                                className="text-red-500 hover:text-white font-bold cursor-pointer transition-colors"
                              >
                                Descartar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {alertsSubTab === 'approved' && (
                <div className="space-y-4">
                  {alertsList.filter(a => a.status === 'aprobado').length === 0 ? (
                    <div className="text-center p-12 bg-[#0A0A0A] border border-zinc-900 font-mono text-xs text-gray-500">
                      NO HAY ALERTAS PUBLICADAS ACTIVAS EN EL MAPA.
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {alertsList.filter(a => a.status === 'aprobado').map((al) => (
                        <div key={al.id} className="bg-[#050506] border border-zinc-900 hover:border-zinc-800 p-4 flex flex-col justify-between gap-3 text-left transition-colors">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase font-bold text-gray-400">{al.province}</span>
                              <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase ${
                                al.type === 'Bajo' ? 'bg-green-955 text-green-400 border border-green-900/30' :
                                al.type === 'Medio' ? 'bg-yellow-955 text-yellow-400 border border-yellow-900/30' :
                                'bg-red-955 text-red-400 border border-red-900/30'
                              }`}>
                                Prioridad {al.type}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white uppercase leading-snug">{al.title}</h4>
                            <p className="text-[10.5px] text-gray-400 leading-relaxed font-sans">{al.description}</p>
                          </div>

                          <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-[9px] font-mono">
                            <span className="text-gray-500">Publicado: {new Date(al.created_at).toLocaleDateString()}</span>
                            <button
                              onClick={() => setShowConfirmDeleteAlert(al.id)}
                              className="text-red-500 hover:text-white font-bold cursor-pointer transition-colors"
                            >
                              Desactivar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ MODAL CREAR / EDITAR CONFLICTO ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-exec-border">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                {editingConflict ? 'Editar Registro de Conflicto' : 'Registrar Nuevo Evento Social'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-550 hover:text-white transition-colors cursor-pointer">
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

      {/* MODAL CREAR ALERTA MANUALMENTE */}
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-zinc-900 w-full max-w-sm p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Activar Alerta Territorial</span>
              </h3>
              <button onClick={() => setShowCreateAlert(false)} className="text-gray-550 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block">Título de la Alerta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tala inmoderada en bosque de Chota..."
                  value={alertForm.title}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-amber-500 rounded-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-450 uppercase block">Provincia *</label>
                  <select
                    value={alertForm.province}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 p-2 text-white outline-none cursor-pointer rounded-none"
                  >
                    {CAJAMARCA_PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-455 uppercase block">Prioridad *</label>
                  <select
                    value={alertForm.type}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-black border border-zinc-800 p-2 text-white outline-none cursor-pointer rounded-none"
                  >
                    <option value="Bajo">Baja Prioridad</option>
                    <option value="Medio">Mediana Prioridad</option>
                    <option value="Alto">Alta Prioridad / Crítica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block">Latitud (Opcional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Ej. -7.15"
                    value={alertForm.latitude}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, latitude: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-amber-500 rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block">Longitud (Opcional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Ej. -78.51"
                    value={alertForm.longitude}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, longitude: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-amber-500 rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-455 uppercase block">Detalles / Descripción *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detalles concretos del suceso o incidente ambiental..."
                  value={alertForm.description}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-black border border-zinc-800 p-2 text-white outline-none focus:border-amber-500 rounded-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900">
              <button
                onClick={() => setShowCreateAlert(false)}
                className="px-4 py-2 border border-zinc-800 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold cursor-pointer rounded-none"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAlert}
                disabled={uploadingAlert}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                {uploadingAlert ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{uploadingAlert ? 'Guardando...' : 'Activar Alerta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONFIRM CONFLICT DELETE ═══ */}
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

      {/* CONFIRMACIÓN DE ALERTA: APROBAR */}
      <ConfirmModal
        isOpen={showConfirmApproveAlert !== null}
        title="¿APROBAR ALERTA CIUDADANA?"
        message="Esta acción aprobará el reporte del ciudadano y lo publicará en el mapa de alertas del Observatorio. ¿Desea continuar?"
        confirmText="Aprobar y Publicar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmApproveAlert) {
            approveAlert(showConfirmApproveAlert);
            setShowConfirmApproveAlert(null);
          }
        }}
        onCancel={() => setShowConfirmApproveAlert(null)}
      />

      {/* CONFIRMACIÓN DE ALERTA: ELIMINAR */}
      <ConfirmModal
        isOpen={showConfirmDeleteAlert !== null}
        title="¿ELIMINAR / DESACTIVAR ALERTA?"
        message="Esta acción eliminará de forma permanente la alerta territorial y ya no se mostrará en el mapa. ¿Desea continuar?"
        confirmText="Eliminar Alerta"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmDeleteAlert) {
            deleteAlert(showConfirmDeleteAlert);
            setShowConfirmDeleteAlert(null);
          }
        }}
        onCancel={() => setShowConfirmDeleteAlert(null)}
      />
    </div>
  );
};
