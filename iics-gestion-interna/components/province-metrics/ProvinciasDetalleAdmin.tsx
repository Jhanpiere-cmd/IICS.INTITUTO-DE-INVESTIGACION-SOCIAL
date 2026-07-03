import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import {
  Save, Loader2, MapPin, Plus, Trash2, Edit3, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, Image, Globe, Building2, Mountain,
  Users, Activity, AlertTriangle, BookOpen, Landmark, Trees
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const PROVINCES = [
  { id: 'cajamarca',  name: 'Cajamarca'  },
  { id: 'hualgayoc', name: 'Hualgayoc'  },
  { id: 'celendin',  name: 'Celendín'   },
  { id: 'cajabamba', name: 'Cajabamba'  },
  { id: 'san-marcos',name: 'San Marcos' },
  { id: 'chota',     name: 'Chota'      },
  { id: 'santa-cruz',name: 'Santa Cruz' },
  { id: 'san-miguel',name: 'San Miguel' },
  { id: 'san-pablo', name: 'San Pablo'  },
  { id: 'jaen',      name: 'Jaén'       },
  { id: 'san-ignacio',name:'San Ignacio'},
  { id: 'cutervo',   name: 'Cutervo'    },
  { id: 'contumaza', name: 'Contumazá'  },
];

const INDICATOR_CATEGORIES = [
  { id: 'economico',  label: 'Económico',   color: 'text-emerald-400', bg: 'bg-emerald-950/20' },
  { id: 'social',     label: 'Social',      color: 'text-blue-400',    bg: 'bg-blue-950/20'    },
  { id: 'ambiental',  label: 'Ambiental',   color: 'text-green-400',   bg: 'bg-green-950/20'   },
  { id: 'seguridad',  label: 'Seguridad',   color: 'text-red-400',     bg: 'bg-red-950/20'     },
  { id: 'salud',      label: 'Salud',       color: 'text-pink-400',    bg: 'bg-pink-950/20'    },
  { id: 'educacion',  label: 'Educación',   color: 'text-purple-400',  bg: 'bg-purple-950/20'  },
];

const DISTRICT_TIPOS = ['distrito', 'caserio', 'centro_poblado'] as const;

// ── Types ────────────────────────────────────────────────────────────────────
interface ProvinceDetail {
  id?: string;
  province_name: string;
  photo_url?: string;
  cover_image_url?: string;
  descripcion?: string;
  historia?: string;
  cultura?: string;
  economia_principal?: string[];
  superficie_km2?: number;
  altitud_msnm?: number;
  poblacion_estimada?: number;
  capital?: string;
  data_sources?: string[];
  lugares_turisticos?: { nombre: string; descripcion: string; foto_url?: string }[];
}

interface District {
  id?: string;
  province_name: string;
  nombre: string;
  capital?: string;
  poblacion?: number;
  altitud_msnm?: number;
  superficie_km2?: number;
  descripcion?: string;
  tipo: typeof DISTRICT_TIPOS[number];
  foto_url?: string;
}

interface ProvinceIndicator {
  id?: string;
  province_name: string;
  categoria: string;
  nombre: string;
  valor?: number;
  unidad?: string;
  periodo?: string;
  fuente?: string;
  tendencia?: string;
  descripcion?: string;
  status?: string;
}

// ── Helper ───────────────────────────────────────────────────────────────────
const emptyDetail = (provinceName: string): ProvinceDetail => ({
  province_name: provinceName,
  photo_url: '',
  cover_image_url: '',
  descripcion: '',
  historia: '',
  cultura: '',
  capital: '',
  superficie_km2: undefined,
  altitud_msnm: undefined,
  poblacion_estimada: undefined,
  economia_principal: [],
  data_sources: [],
  lugares_turisticos: [],
});

const emptyIndicator = (provinceName: string): ProvinceIndicator => ({
  province_name: provinceName,
  categoria: 'economico',
  nombre: '',
  valor: undefined,
  unidad: '%',
  periodo: new Date().toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }),
  fuente: 'IICS',
  tendencia: 'estable',
  descripcion: '',
  status: 'published',
});

const emptyDistrict = (provinceName: string): District => ({
  province_name: provinceName,
  nombre: '',
  tipo: 'distrito',
  capital: '',
  poblacion: undefined,
  altitud_msnm: undefined,
  descripcion: '',
});

// ── Main Component ────────────────────────────────────────────────────────────
export const ProvinciasDetalleAdmin: React.FC = () => {
  const { showToast } = useToast();
  const [activeProvince, setActiveProvince] = useState('cajamarca');
  const [activeTab, setActiveTab] = useState<'info'|'distritos'|'indicadores'|'turismo'>('info');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data states
  const [detail, setDetail] = useState<ProvinceDetail>(emptyDetail('Cajamarca'));
  const [districts, setDistricts] = useState<District[]>([]);
  const [indicators, setIndicators] = useState<ProvinceIndicator[]>([]);

  // Form states
  const [economiaInput, setEconomiaInput] = useState('');
  const [sourcesInput, setSourcesInput] = useState('');
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [showDistrictForm, setShowDistrictForm] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<ProvinceIndicator | null>(null);
  const [showIndicatorForm, setShowIndicatorForm] = useState(false);
  const [districtFilter, setDistrictFilter] = useState<'all'|typeof DISTRICT_TIPOS[number]>('all');
  const [indCatFilter, setIndCatFilter] = useState('all');

  const provinceName = PROVINCES.find(p => p.id === activeProvince)?.name || '';

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!provinceName) return;
    setLoading(true);
    try {
      const [detailRes, districtsRes, indicatorsRes] = await Promise.all([
        supabase.from('province_details').select('*').eq('province_name', provinceName).single(),
        supabase.from('districts').select('*').eq('province_name', provinceName).order('tipo').order('nombre'),
        supabase.from('province_indicators').select('*').eq('province_name', provinceName).order('categoria').order('nombre'),
      ]);
      const d = detailRes.data || emptyDetail(provinceName);
      setDetail({ ...emptyDetail(provinceName), ...d });
      setEconomiaInput((d.economia_principal || []).join(', '));
      setSourcesInput((d.data_sources || []).join(', '));
      setDistricts(districtsRes.data || []);
      setIndicators(indicatorsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [provinceName]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save province detail ──────────────────────────────────────────────────
  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: ProvinceDetail = {
        ...detail,
        province_name: provinceName,
        economia_principal: economiaInput.split(',').map(s => s.trim()).filter(Boolean),
        data_sources: sourcesInput.split(',').map(s => s.trim()).filter(Boolean),
      };
      const { error } = await supabase.from('province_details').upsert(payload, { onConflict: 'province_name' });
      if (error) throw error;
      showToast({ message: `✅ Info de ${provinceName} guardada. El Observatorio la verá en la próxima carga.`, type: 'success' });
      loadData();
    } catch (e: any) {
      showToast({ message: e.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Save district ──────────────────────────────────────────────────────────
  const handleSaveDistrict = async () => {
    if (!editingDistrict?.nombre?.trim()) {
      showToast({ message: 'El nombre del distrito/caserío es requerido', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...editingDistrict, province_name: provinceName };
      if (payload.id) {
        const { error } = await supabase.from('districts').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { id: _id, ...rest } = payload;
        const { error } = await supabase.from('districts').insert(rest);
        if (error) throw error;
      }
      showToast({ message: `✅ ${editingDistrict.tipo} "${editingDistrict.nombre}" guardado`, type: 'success' });
      setEditingDistrict(null);
      setShowDistrictForm(false);
      loadData();
    } catch (e: any) {
      showToast({ message: e.message || 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDistrict = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    const { error } = await supabase.from('districts').delete().eq('id', id);
    if (error) showToast({ message: error.message, type: 'error' });
    else { showToast({ message: `Eliminado`, type: 'success' }); loadData(); }
  };

  // ── Save indicator ─────────────────────────────────────────────────────────
  const handleSaveIndicator = async () => {
    if (!editingIndicator?.nombre?.trim()) {
      showToast({ message: 'El nombre del indicador es requerido', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...editingIndicator, province_name: provinceName };
      if (payload.id) {
        const { error } = await supabase.from('province_indicators').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { id: _id, ...rest } = payload;
        const { error } = await supabase.from('province_indicators').insert(rest);
        if (error) throw error;
      }
      showToast({ message: `✅ Indicador "${editingIndicator.nombre}" guardado`, type: 'success' });
      setEditingIndicator(null);
      setShowIndicatorForm(false);
      loadData();
    } catch (e: any) {
      showToast({ message: e.message || 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIndicator = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar indicador "${nombre}"?`)) return;
    const { error } = await supabase.from('province_indicators').delete().eq('id', id);
    if (error) showToast({ message: error.message, type: 'error' });
    else { showToast({ message: 'Indicador eliminado', type: 'success' }); loadData(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-black min-h-screen px-4 pb-8 pt-0 md:pt-4 md:px-6 space-y-5">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-none border border-cyan-500/20">
              <Landmark className="text-cyan-400 h-6 w-6" />
            </div>
            <span>Gestión <span className="text-cyan-400">Territorial</span> Detallada</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
            Administra provincias · distritos · caseríos · indicadores · turismo
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          CONECTADO · province_details BD
        </div>
      </div>

      {/* Province Selector */}
      <div className="flex flex-wrap gap-2">
        {PROVINCES.map(p => (
          <button key={p.id} type="button"
            onClick={() => { setActiveProvince(p.id); setShowDistrictForm(false); setShowIndicatorForm(false); }}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase border transition-all cursor-pointer ${
              activeProvince === p.id
                ? 'bg-cyan-500 text-black border-cyan-500'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-cyan-700 hover:text-white'
            }`}>
            {p.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* Sub-tab Navigation */}
          <div className="flex gap-1 border-b border-zinc-900 pb-0">
            {[
              { id: 'info',        label: 'Info General',   icon: <Globe className="h-3.5 w-3.5" /> },
              { id: 'indicadores', label: 'Indicadores',    icon: <Activity className="h-3.5 w-3.5" /> },
              { id: 'distritos',   label: 'Distritos & Caseríos', icon: <MapPin className="h-3.5 w-3.5" /> },
              { id: 'turismo',     label: 'Turismo & Cultura', icon: <Mountain className="h-3.5 w-3.5" /> },
            ].map(tab => (
              <button key={tab.id} type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono font-bold uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-zinc-500 hover:text-white'
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: INFO GENERAL ── */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveDetail} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: basic info */}
                <div className="space-y-4 bg-zinc-950 border border-zinc-900 p-5">
                  <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-zinc-900 pb-2">Datos Básicos</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Capital</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={detail.capital || ''} onChange={e => setDetail({...detail, capital: e.target.value})} placeholder="Ej: Cajamarca" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Población Est.</label>
                      <input type="number" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={detail.poblacion_estimada || ''} onChange={e => setDetail({...detail, poblacion_estimada: Number(e.target.value)})} placeholder="382000" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Superficie (km²)</label>
                      <input type="number" step="0.1" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={detail.superficie_km2 || ''} onChange={e => setDetail({...detail, superficie_km2: Number(e.target.value)})} placeholder="2979" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Altitud (msnm)</label>
                      <input type="number" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={detail.altitud_msnm || ''} onChange={e => setDetail({...detail, altitud_msnm: Number(e.target.value)})} placeholder="2750" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Foto de Portada (URL)</label>
                    <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                      value={detail.photo_url || ''} onChange={e => setDetail({...detail, photo_url: e.target.value})} placeholder="https://... o URL de Supabase Storage" />
                    {detail.photo_url && (
                      <img src={detail.photo_url} alt="Preview" className="mt-2 h-24 w-full object-cover border border-zinc-800" onError={e => (e.currentTarget.style.display='none')} />
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Actividades Económicas (separadas por coma)</label>
                    <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                      value={economiaInput} onChange={e => setEconomiaInput(e.target.value)} placeholder="Minería, Agricultura, Turismo" />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {economiaInput.split(',').map(s => s.trim()).filter(Boolean).map(eco => (
                        <span key={eco} className="text-[8px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/20 px-1.5 py-0.5">{eco}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Fuentes de Datos (separadas por coma)</label>
                    <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                      value={sourcesInput} onChange={e => setSourcesInput(e.target.value)} placeholder="INEI, MINEM, Defensoría del Pueblo" />
                  </div>
                </div>

                {/* Right: rich text fields */}
                <div className="space-y-4 bg-zinc-950 border border-zinc-900 p-5">
                  <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-zinc-900 pb-2">Descripción Territorial</h3>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Descripción General</label>
                    <textarea rows={4} className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none resize-none"
                      value={detail.descripcion || ''} onChange={e => setDetail({...detail, descripcion: e.target.value})}
                      placeholder="Descripción territorial completa visible en el Observatorio..." />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Historia</label>
                    <textarea rows={4} className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none resize-none"
                      value={detail.historia || ''} onChange={e => setDetail({...detail, historia: e.target.value})}
                      placeholder="Contexto histórico de la provincia..." />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Cultura y Tradiciones</label>
                    <textarea rows={3} className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none resize-none"
                      value={detail.cultura || ''} onChange={e => setDetail({...detail, cultura: e.target.value})}
                      placeholder="Festividades, artesanía, danzas, gastronomía..." />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase font-mono transition-colors disabled:opacity-50 cursor-pointer">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Info de {provinceName}
              </button>
            </form>
          )}

          {/* ── TAB: INDICADORES ── */}
          {activeTab === 'indicadores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1 flex-wrap">
                  {['all', ...INDICATOR_CATEGORIES.map(c => c.id)].map(cat => {
                    const cfg = INDICATOR_CATEGORIES.find(c => c.id === cat);
                    return (
                      <button key={cat} type="button"
                        onClick={() => setIndCatFilter(cat)}
                        className={`text-[9px] font-mono uppercase px-2.5 py-1 border transition-all cursor-pointer ${
                          indCatFilter === cat ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white'
                        }`}>
                        {cat === 'all' ? 'Todos' : cfg?.label || cat}
                      </button>
                    );
                  })}
                </div>
                <button type="button"
                  onClick={() => { setEditingIndicator(emptyIndicator(provinceName)); setShowIndicatorForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-black text-[10px] font-mono font-bold uppercase cursor-pointer hover:bg-cyan-400">
                  <Plus className="h-3.5 w-3.5" /> Nuevo Indicador
                </button>
              </div>

              {/* Indicator form modal */}
              {showIndicatorForm && editingIndicator && (
                <div className="bg-zinc-950 border border-cyan-900 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase font-mono">
                    {editingIndicator.id ? 'Editar' : 'Nuevo'} Indicador — {provinceName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Categoría</label>
                      <select className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.categoria} onChange={e => setEditingIndicator({...editingIndicator, categoria: e.target.value})}>
                        {INDICATOR_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Nombre del Indicador</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.nombre} onChange={e => setEditingIndicator({...editingIndicator, nombre: e.target.value})}
                        placeholder="Ej: Tasa de pobreza monetaria" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Valor</label>
                      <input type="number" step="0.01" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.valor ?? ''} onChange={e => setEditingIndicator({...editingIndicator, valor: e.target.value ? Number(e.target.value) : undefined})}
                        placeholder="28.4" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Unidad</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.unidad || ''} onChange={e => setEditingIndicator({...editingIndicator, unidad: e.target.value})}
                        placeholder="%, soles, km², hab/km²" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Tendencia</label>
                      <select className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.tendencia || 'estable'} onChange={e => setEditingIndicator({...editingIndicator, tendencia: e.target.value})}>
                        <option value="subida">↑ Subida</option>
                        <option value="bajada">↓ Bajada</option>
                        <option value="estable">━ Estable</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Período</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.periodo || ''} onChange={e => setEditingIndicator({...editingIndicator, periodo: e.target.value})}
                        placeholder="Jul 2026" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Fuente</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.fuente || ''} onChange={e => setEditingIndicator({...editingIndicator, fuente: e.target.value})}
                        placeholder="INEI, MINEM, IICS..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Visibilidad</label>
                      <select className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingIndicator.status || 'published'} onChange={e => setEditingIndicator({...editingIndicator, status: e.target.value})}>
                        <option value="published">Publicado</option>
                        <option value="draft">Borrador</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Descripción (opcional)</label>
                      <textarea rows={2} className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none resize-none"
                        value={editingIndicator.descripcion || ''} onChange={e => setEditingIndicator({...editingIndicator, descripcion: e.target.value})}
                        placeholder="Contexto adicional del indicador..." />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveIndicator} disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 text-black font-bold text-xs font-mono uppercase cursor-pointer hover:bg-cyan-400 disabled:opacity-50">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                    </button>
                    <button type="button" onClick={() => { setShowIndicatorForm(false); setEditingIndicator(null); }}
                      className="px-4 py-2 bg-zinc-900 text-zinc-400 text-xs font-mono uppercase cursor-pointer hover:text-white border border-zinc-800">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Indicators grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {indicators
                  .filter(ind => indCatFilter === 'all' || ind.categoria === indCatFilter)
                  .map(ind => {
                    const cfg = INDICATOR_CATEGORIES.find(c => c.id === ind.categoria);
                    return (
                      <div key={ind.id} className="bg-zinc-950 border border-zinc-900 p-3 space-y-1 group relative">
                        <div className="flex items-center justify-between">
                          <span className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 ${cfg?.color || 'text-zinc-400'} ${cfg?.bg || 'bg-zinc-900'}`}>
                            {cfg?.label || ind.categoria}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => { setEditingIndicator({...ind}); setShowIndicatorForm(true); }}
                              className="p-1 text-zinc-500 hover:text-cyan-400 cursor-pointer">
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => handleDeleteIndicator(ind.id!, ind.nombre)}
                              className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono block truncate">{ind.nombre}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-white font-mono">
                            {typeof ind.valor === 'number' ? ind.valor.toLocaleString() : '—'}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">{ind.unidad}</span>
                          {ind.tendencia === 'subida' && <TrendingUp className="h-3 w-3 text-red-400 ml-auto" />}
                          {ind.tendencia === 'bajada' && <TrendingDown className="h-3 w-3 text-emerald-400 ml-auto" />}
                          {ind.tendencia === 'estable' && <Minus className="h-3 w-3 text-zinc-500 ml-auto" />}
                        </div>
                        {ind.fuente && <span className="text-[8px] text-zinc-600 font-mono">{ind.fuente} · {ind.periodo}</span>}
                      </div>
                    );
                  })}
                {indicators.filter(ind => indCatFilter === 'all' || ind.categoria === indCatFilter).length === 0 && (
                  <div className="col-span-3 py-12 text-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-900">
                    No hay indicadores para {provinceName} en esta categoría.<br />
                    <span className="text-cyan-700">Agrega uno con el botón de arriba.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: DISTRITOS & CASERÍOS ── */}
          {activeTab === 'distritos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1">
                  {(['all', ...DISTRICT_TIPOS] as const).map(tipo => (
                    <button key={tipo} type="button"
                      onClick={() => setDistrictFilter(tipo as any)}
                      className={`text-[9px] font-mono uppercase px-2.5 py-1 border transition-all cursor-pointer ${
                        districtFilter === tipo ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white'
                      }`}>
                      {tipo === 'all' ? 'Todos' : tipo === 'centro_poblado' ? 'C. Poblado' : tipo}
                    </button>
                  ))}
                </div>
                <button type="button"
                  onClick={() => { setEditingDistrict(emptyDistrict(provinceName)); setShowDistrictForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-black text-[10px] font-mono font-bold uppercase cursor-pointer hover:bg-cyan-400">
                  <Plus className="h-3.5 w-3.5" /> Agregar Distrito/Caserío
                </button>
              </div>

              {/* District form */}
              {showDistrictForm && editingDistrict && (
                <div className="bg-zinc-950 border border-cyan-900 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase font-mono">
                    {editingDistrict.id ? 'Editar' : 'Nuevo'} · {provinceName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Tipo</label>
                      <select className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.tipo} onChange={e => setEditingDistrict({...editingDistrict, tipo: e.target.value as any})}>
                        {DISTRICT_TIPOS.map(t => <option key={t} value={t}>{t === 'centro_poblado' ? 'Centro Poblado' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Nombre *</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.nombre} onChange={e => setEditingDistrict({...editingDistrict, nombre: e.target.value})}
                        placeholder="Nombre del distrito o caserío" autoFocus />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Capital</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.capital || ''} onChange={e => setEditingDistrict({...editingDistrict, capital: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Población</label>
                      <input type="number" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.poblacion || ''} onChange={e => setEditingDistrict({...editingDistrict, poblacion: e.target.value ? Number(e.target.value) : undefined})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Altitud (msnm)</label>
                      <input type="number" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.altitud_msnm || ''} onChange={e => setEditingDistrict({...editingDistrict, altitud_msnm: e.target.value ? Number(e.target.value) : undefined})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Superficie (km²)</label>
                      <input type="number" step="0.1" className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.superficie_km2 || ''} onChange={e => setEditingDistrict({...editingDistrict, superficie_km2: e.target.value ? Number(e.target.value) : undefined})} />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Foto URL</label>
                      <input className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                        value={editingDistrict.foto_url || ''} onChange={e => setEditingDistrict({...editingDistrict, foto_url: e.target.value})} placeholder="https://..." />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Descripción</label>
                      <textarea rows={2} className="w-full bg-black border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none resize-none"
                        value={editingDistrict.descripcion || ''} onChange={e => setEditingDistrict({...editingDistrict, descripcion: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveDistrict} disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 text-black font-bold text-xs font-mono uppercase cursor-pointer hover:bg-cyan-400 disabled:opacity-50">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                    </button>
                    <button type="button" onClick={() => { setShowDistrictForm(false); setEditingDistrict(null); }}
                      className="px-4 py-2 bg-zinc-900 text-zinc-400 text-xs font-mono uppercase cursor-pointer hover:text-white border border-zinc-800">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Districts list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {districts
                  .filter(d => districtFilter === 'all' || d.tipo === districtFilter)
                  .map(d => (
                    <div key={d.id} className="bg-zinc-950 border border-zinc-900 p-3 space-y-1.5 group relative">
                      <div className="flex items-center justify-between">
                        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 ${
                          d.tipo === 'distrito' ? 'text-cyan-400 bg-cyan-950/20' :
                          d.tipo === 'caserio'  ? 'text-amber-400 bg-amber-950/20' :
                          'text-purple-400 bg-purple-950/20'
                        }`}>{d.tipo === 'centro_poblado' ? 'C. Poblado' : d.tipo}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => { setEditingDistrict({...d}); setShowDistrictForm(true); }}
                            className="p-1 text-zinc-500 hover:text-cyan-400 cursor-pointer">
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => handleDeleteDistrict(d.id!, d.nombre)}
                            className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <span className="font-bold text-white text-xs font-mono block">{d.nombre}</span>
                      {d.capital && <span className="text-[9px] text-zinc-500 font-mono block">Capital: {d.capital}</span>}
                      <div className="flex gap-3 text-[9px] text-zinc-600 font-mono">
                        {d.poblacion && <span><Users className="h-2.5 w-2.5 inline mr-0.5" />{d.poblacion.toLocaleString()}</span>}
                        {d.altitud_msnm && <span><Mountain className="h-2.5 w-2.5 inline mr-0.5" />{d.altitud_msnm} m</span>}
                      </div>
                      {d.descripcion && <p className="text-[9px] text-zinc-500 leading-relaxed line-clamp-2">{d.descripcion}</p>}
                    </div>
                  ))}
                {districts.filter(d => districtFilter === 'all' || d.tipo === districtFilter).length === 0 && (
                  <div className="col-span-3 py-12 text-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-900">
                    No hay {districtFilter === 'all' ? 'distritos/caseríos' : districtFilter} para {provinceName}.<br />
                    <span className="text-cyan-700">Agrega uno con el botón de arriba.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: TURISMO & CULTURA ── */}
          {activeTab === 'turismo' && (
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-900 p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-zinc-900 pb-2 flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-cyan-400" />
                  Lugares Turísticos — {provinceName}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">Los lugares turísticos se guardan junto con la Info General de la provincia.</p>

                {(detail.lugares_turisticos || []).map((lugar, idx) => (
                  <div key={idx} className="bg-black border border-zinc-800 p-4 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-amber-400 uppercase">Lugar #{idx + 1}</span>
                      <button type="button"
                        onClick={() => {
                          const updated = [...(detail.lugares_turisticos || [])];
                          updated.splice(idx, 1);
                          setDetail({...detail, lugares_turisticos: updated});
                        }}
                        className="p-1 text-zinc-600 hover:text-red-400 cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                      placeholder="Nombre del lugar" value={lugar.nombre || ''}
                      onChange={e => {
                        const updated = [...(detail.lugares_turisticos || [])];
                        updated[idx] = { ...updated[idx], nombre: e.target.value };
                        setDetail({...detail, lugares_turisticos: updated});
                      }} />
                    <textarea rows={2} className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none resize-none"
                      placeholder="Descripción del lugar turístico" value={lugar.descripcion || ''}
                      onChange={e => {
                        const updated = [...(detail.lugares_turisticos || [])];
                        updated[idx] = { ...updated[idx], descripcion: e.target.value };
                        setDetail({...detail, lugares_turisticos: updated});
                      }} />
                    <input className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2 font-mono focus:border-cyan-500 outline-none"
                      placeholder="URL de foto (opcional)" value={lugar.foto_url || ''}
                      onChange={e => {
                        const updated = [...(detail.lugares_turisticos || [])];
                        updated[idx] = { ...updated[idx], foto_url: e.target.value };
                        setDetail({...detail, lugares_turisticos: updated});
                      }} />
                  </div>
                ))}

                <button type="button"
                  onClick={() => setDetail({...detail, lugares_turisticos: [...(detail.lugares_turisticos || []), { nombre: '', descripcion: '', foto_url: '' }]})}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-zinc-400 text-[10px] font-mono uppercase cursor-pointer hover:text-white border border-zinc-800 hover:border-zinc-600">
                  <Plus className="h-3.5 w-3.5" /> Agregar Lugar Turístico
                </button>

                <button type="button" onClick={handleSaveDetail as any} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase font-mono transition-colors disabled:opacity-50 cursor-pointer">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Lugares Turísticos
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ProvinciasDetalleAdmin;
