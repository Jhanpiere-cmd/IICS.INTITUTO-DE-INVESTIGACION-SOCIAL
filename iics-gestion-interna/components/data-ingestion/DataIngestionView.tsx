import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  Plus, Edit3, Trash2, X, Loader2, Search,
  Filter, ExternalLink, Download, Copy, Database
} from 'lucide-react';

// ─── Shared Constants ───────────────────────────────────────
const PROVINCES = [
  'San Ignacio','Jaén','Cutervo','Chota','Santa Cruz',
  'Hualgayoc','Celendín','San Miguel','San Pablo',
  'Cajamarca','Contumazá','San Marcos','Cajabamba'
];

const FUENTES_INDICADORES = ['INEI','MINEM','Defensoría del Pueblo','ANA-SENAMHI','IICS-Campo','Otro'];
const CATEGORIAS_INDICADORES = [
  { id: 'pobreza', label: 'Pobreza & NBI' },
  { id: 'mineria', label: 'Minería' },
  { id: 'agua', label: 'Recursos Hídricos' },
  { id: 'conflictos', label: 'Conflictos' },
  { id: 'redes', label: 'Redes Sociales' },
  { id: 'bienestar', label: 'Bienestar Social' },
  { id: 'otro', label: 'Otro' },
];
const CATEGORIAS_DATASETS = [
  { id: 'conflictos', label: 'Conflictos Sociales' },
  { id: 'gis', label: 'GIS / Cartografía' },
  { id: 'encuestas', label: 'Encuestas & Percepción' },
  { id: 'indicadores', label: 'Indicadores Estadísticos' },
  { id: 'otro', label: 'Otro' },
];

// ─── INDICATORS TAB ─────────────────────────────────────────
const emptyIndicator = {
  provincia: 'Cajamarca', fuente: 'INEI', categoria: 'pobreza',
  indicador: '', valor: '', unidad: '%', periodo: '', url_fuente: '', notas: '', status: 'published',
};

function IndicatorsTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyIndicator);
  const [search, setSearch] = useState('');
  const [filterFuente, setFilterFuente] = useState('all');
  const [filterProv, setFilterProv] = useState('all');

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('statistical_indicators')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyIndicator); setShowModal(true); };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ provincia: item.provincia, fuente: item.fuente, categoria: item.categoria,
      indicador: item.indicador, valor: String(item.valor), unidad: item.unidad,
      periodo: item.periodo, url_fuente: item.url_fuente || '', notas: item.notas || '', status: item.status });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.indicador.trim() || !form.valor.trim() || !form.periodo.trim()) {
      showToast({ message: 'Indicador, valor y período son requeridos.', type: 'error' }); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, valor: parseFloat(form.valor), updated_at: new Date().toISOString() };
      if (editing) {
        const { error } = await supabase.from('statistical_indicators').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast({ message: 'Indicador actualizado.', type: 'success' });
      } else {
        const { error } = await supabase.from('statistical_indicators').insert(payload);
        if (error) throw error;
        showToast({ message: 'Indicador registrado. Aparecerá en el Observatorio → Provincias.', type: 'success' });
      }
      setShowModal(false); fetch();
    } catch (e: any) { showToast({ message: e.message || 'Error al guardar.', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const { error } = await supabase.from('statistical_indicators').delete().eq('id', toDelete.id);
      if (error) throw error;
      showToast({ message: 'Indicador eliminado.', type: 'success' });
      setToDelete(null); fetch();
    } catch (e: any) { showToast({ message: e.message || 'Error.', type: 'error' }); }
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.indicador.toLowerCase().includes(search.toLowerCase()) || i.provincia.toLowerCase().includes(search.toLowerCase());
    const matchFuente = filterFuente === 'all' || i.fuente === filterFuente;
    const matchProv = filterProv === 'all' || i.provincia === filterProv;
    return matchSearch && matchFuente && matchProv;
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Indicadores', value: items.length, color: 'text-exec-blue', icon: 'bar_chart' },
          { label: 'Fuentes Activas', value: [...new Set(items.map(i => i.fuente))].length, color: 'text-emerald-400', icon: 'source' },
          { label: 'Provincias Cubiertas', value: [...new Set(items.map(i => i.provincia))].length, color: 'text-yellow-400', icon: 'location_on' },
          { label: 'Periodos Distintos', value: [...new Set(items.map(i => i.periodo))].length, color: 'text-purple-400', icon: 'calendar_month' },
        ].map(s => (
          <div key={s.label} className="exec-card bg-[#0A0A0A] p-4 flex flex-col justify-between h-20">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{s.label}</span>
              <span className={`material-symbols-outlined notranslate text-base ${s.color}`} translate="no">{s.icon}</span>
            </div>
            <p className={`text-2xl font-light ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar indicador o provincia..."
            className="w-full bg-[#0A0A0A] border border-exec-border text-white text-xs pl-8 pr-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
        </div>
        <select value={filterFuente} onChange={e => setFilterFuente(e.target.value)}
          className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] uppercase font-bold px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer">
          <option value="all">Todas las fuentes</option>
          {FUENTES_INDICADORES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterProv} onChange={e => setFilterProv(e.target.value)}
          className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] uppercase font-bold px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer">
          <option value="all">Todas las provincias</option>
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={openAdd}
          className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-none flex items-center gap-2 transition-all">
          <Plus size={13} /> Nuevo Indicador
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-exec-border border-t-exec-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-10 bg-[#0A0A0A] border border-exec-border">
          <span className="material-symbols-outlined notranslate text-gray-700 text-4xl mb-2 block" translate="no">analytics</span>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {items.length === 0 ? 'Sin indicadores. Registra el primero.' : 'Sin resultados para los filtros.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-exec-border">
                {['Provincia','Fuente','Categoría','Indicador','Valor','Período',''].map(h => (
                  <th key={h} className="pb-2 text-[9px] font-black text-gray-500 uppercase tracking-widest pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-exec-border/30 hover:bg-white/2 transition-colors group">
                  <td className="py-2.5 pr-4 text-[11px] text-exec-blue font-bold">{item.provincia}</td>
                  <td className="py-2.5 pr-4 text-[11px] text-gray-300 font-mono">{item.fuente}</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-white/5 border border-exec-border text-gray-400">{item.categoria}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-[11px] text-white max-w-[200px] truncate">{item.indicador}</td>
                  <td className="py-2.5 pr-4 text-[11px] text-emerald-400 font-bold font-mono">{item.valor} {item.unidad}</td>
                  <td className="py-2.5 pr-4 text-[11px] text-gray-500 font-mono">{item.periodo}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(item)} className="text-gray-600 hover:text-white cursor-pointer"><Edit3 size={12} /></button>
                      <button onClick={() => setToDelete(item)} className="text-red-600 hover:text-red-400 cursor-pointer"><Trash2 size={12} /></button>
                      {item.url_fuente && <a href={item.url_fuente} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-exec-blue cursor-pointer"><ExternalLink size={12} /></a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-exec-border">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter">
                {editing ? 'Editar Indicador' : 'Nuevo Indicador Estadístico'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Provincia</label>
                  <select value={form.provincia} onChange={e => setForm(p => ({ ...p, provincia: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer">
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Fuente</label>
                  <select value={form.fuente} onChange={e => setForm(p => ({ ...p, fuente: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer">
                    {FUENTES_INDICADORES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer">
                    {CATEGORIAS_INDICADORES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Período <span className="text-red-400">*</span></label>
                  <input type="text" required value={form.periodo} onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}
                    placeholder="2025-Q3, 2026-Anual..."
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Nombre del Indicador <span className="text-red-400">*</span></label>
                <input type="text" required value={form.indicador} onChange={e => setForm(p => ({ ...p, indicador: e.target.value }))}
                  placeholder="Índice de Pobreza Monetaria, Unidades Mineras Activas..."
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Valor <span className="text-red-400">*</span></label>
                  <input type="number" step="any" required value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Unidad</label>
                  <input type="text" value={form.unidad} onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))}
                    placeholder="%, unidades, m3/s, casos..."
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">URL de la Fuente</label>
                <input type="url" value={form.url_fuente} onChange={e => setForm(p => ({ ...p, url_fuente: e.target.value }))}
                  placeholder="https://inei.gob.pe/..."
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                  placeholder="Metodología, aclaraciones, fuente exacta del dato..."
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-exec-border/50">
                <button type="button" onClick={() => setShowModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-exec-border text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-none cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-exec-blue hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2 rounded-none cursor-pointer">
                  {saving && <Loader2 size={11} className="animate-spin" />}
                  {editing ? 'Guardar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmModal isOpen={!!toDelete} title="¿Eliminar indicador?"
          message={`"${toDelete.indicador}" de ${toDelete.provincia} será eliminado permanentemente.`}
          confirmText="Eliminar" cancelText="Cancelar"
          onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
      )}
    </div>
  );
}

// ─── DATASETS TAB ────────────────────────────────────────────
const emptyDataset = {
  titulo: '', filename: '', descripcion: '', categoria: 'conflictos',
  fuente: 'IICS-Campo', anio: new Date().getFullYear(), version: '1.0',
  size_mb: '', hash_sha256: '', download_url: '', status: 'published',
};

function DatasetsTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(emptyDataset);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchDatasets(); }, []);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('research_datasets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyDataset); setShowModal(true); };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ titulo: item.titulo, filename: item.filename, descripcion: item.descripcion,
      categoria: item.categoria, fuente: item.fuente, anio: item.anio, version: item.version,
      size_mb: String(item.size_mb || ''), hash_sha256: item.hash_sha256 || '',
      download_url: item.download_url || '', status: item.status });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.filename.trim()) {
      showToast({ message: 'Título y nombre de archivo son requeridos.', type: 'error' }); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, anio: parseInt(form.anio), size_mb: form.size_mb ? parseFloat(form.size_mb) : null, updated_at: new Date().toISOString() };
      if (editing) {
        const { error } = await supabase.from('research_datasets').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast({ message: 'Dataset actualizado.', type: 'success' });
      } else {
        const { error } = await supabase.from('research_datasets').insert(payload);
        if (error) throw error;
        showToast({ message: 'Dataset registrado. Aparecerá en el Observatorio → Biblioteca.', type: 'success' });
      }
      setShowModal(false); fetchDatasets();
    } catch (e: any) { showToast({ message: e.message || 'Error.', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const { error } = await supabase.from('research_datasets').delete().eq('id', toDelete.id);
      if (error) throw error;
      showToast({ message: 'Dataset eliminado.', type: 'success' });
      setToDelete(null); fetchDatasets();
    } catch (e: any) { showToast({ message: e.message || 'Error.', type: 'error' }); }
  };

  const filtered = items.filter(i =>
    !search || i.titulo.toLowerCase().includes(search.toLowerCase()) || i.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar dataset..."
            className="w-full bg-[#0A0A0A] border border-exec-border text-white text-xs pl-8 pr-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
        </div>
        <button onClick={openAdd}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-none flex items-center gap-2 transition-all">
          <Plus size={13} /> Nuevo Dataset
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-exec-border border-t-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ds => (
            <div key={ds.id} className="exec-card bg-[#0A0A0A] p-4 flex flex-col justify-between gap-3 hover:border-purple-500/30 transition-all">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    {CATEGORIAS_DATASETS.find(c => c.id === ds.categoria)?.label || ds.categoria}
                  </span>
                  <span className="text-[9px] text-gray-600 font-mono">{ds.size_mb ? `${ds.size_mb} MB` : '—'}</span>
                </div>
                <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">{ds.titulo}</h3>
                <p className="text-[10px] text-gray-500 font-mono break-all">{ds.filename}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{ds.descripcion}</p>
              </div>
              {ds.hash_sha256 && (
                <div className="flex items-center gap-1 bg-black border border-exec-border/50 px-2 py-1">
                  <span className="text-[8px] font-mono text-gray-600 truncate flex-1">SHA256: {ds.hash_sha256.slice(0, 24)}...</span>
                  <button onClick={() => { navigator.clipboard.writeText(ds.hash_sha256); showToast({ message: 'Hash copiado.', type: 'info' }); }}
                    className="text-gray-600 hover:text-white cursor-pointer flex-shrink-0"><Copy size={10} /></button>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-exec-border/30">
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(ds)} className="text-[9px] font-bold text-gray-500 hover:text-white flex items-center gap-1 cursor-pointer">
                    <Edit3 size={10} /> Editar
                  </button>
                  <button onClick={() => setToDelete(ds)} className="text-[9px] font-bold text-red-600 hover:text-red-400 flex items-center gap-1 cursor-pointer">
                    <Trash2 size={10} /> Eliminar
                  </button>
                </div>
                {ds.download_url ? (
                  <a href={ds.download_url} target="_blank" rel="noopener noreferrer"
                    className="text-[9px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    <Download size={10} /> Descargar
                  </a>
                ) : (
                  <span className="text-[9px] text-gray-700 font-mono">Sin URL</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-3 text-center p-10 bg-[#0A0A0A] border border-exec-border">
              <span className="material-symbols-outlined notranslate text-gray-700 text-4xl mb-2 block" translate="no">folder_open</span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {items.length === 0 ? 'Sin datasets. Registra el primero.' : 'Sin resultados.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-exec-border">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter">
                {editing ? 'Editar Dataset' : 'Registrar Dataset'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Título <span className="text-red-400">*</span></label>
                <input type="text" required value={form.titulo} onChange={e => setForm((p:any) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Indicadores de Conflictos Q1 2026..."
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Nombre de archivo <span className="text-red-400">*</span></label>
                <input type="text" required value={form.filename} onChange={e => setForm((p:any) => ({ ...p, filename: e.target.value }))}
                  placeholder="IICS_conflictos_2026_Q1.xlsx"
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm((p:any) => ({ ...p, descripcion: e.target.value }))} rows={2}
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Categoría</label>
                  <select value={form.categoria} onChange={e => setForm((p:any) => ({ ...p, categoria: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue cursor-pointer">
                    {CATEGORIAS_DATASETS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Fuente</label>
                  <input type="text" value={form.fuente} onChange={e => setForm((p:any) => ({ ...p, fuente: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Año</label>
                  <input type="number" value={form.anio} onChange={e => setForm((p:any) => ({ ...p, anio: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Versión</label>
                  <input type="text" value={form.version} onChange={e => setForm((p:any) => ({ ...p, version: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Tamaño (MB)</label>
                  <input type="number" step="0.1" value={form.size_mb} onChange={e => setForm((p:any) => ({ ...p, size_mb: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">URL de descarga</label>
                <input type="url" value={form.download_url} onChange={e => setForm((p:any) => ({ ...p, download_url: e.target.value }))}
                  placeholder="https://... (Supabase Storage o enlace externo)"
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Hash SHA-256</label>
                <input type="text" value={form.hash_sha256} onChange={e => setForm((p:any) => ({ ...p, hash_sha256: e.target.value }))}
                  placeholder="8f9e2b1c4a037b5e..."
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-exec-blue font-mono" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-exec-border/50">
                <button type="button" onClick={() => setShowModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-exec-border text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-none cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2 rounded-none cursor-pointer">
                  {saving && <Loader2 size={11} className="animate-spin" />}
                  {editing ? 'Guardar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmModal isOpen={!!toDelete} title="¿Eliminar dataset?"
          message={`"${toDelete.titulo}" será eliminado permanentemente.`}
          confirmText="Eliminar" cancelText="Cancelar"
          onConfirm={handleDelete} onCancel={() => setToDelete(null)} />
      )}
    </div>
  );
}

// ─── MAIN VIEW ───────────────────────────────────────────────
type Tab = 'indicators' | 'surveys_link' | 'datasets';

export const DataIngestionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('indicators');

  const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
    { id: 'indicators', label: 'Indicadores Estadísticos', icon: 'bar_chart', color: 'text-exec-blue' },
    { id: 'surveys_link', label: 'Encuestas de Percepción', icon: 'poll', color: 'text-yellow-400' },
    { id: 'datasets', label: 'Repositorio de Datasets', icon: 'folder_open', color: 'text-purple-400' },
  ];

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-4 border-b border-exec-border">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
          <div className="p-1.5 bg-exec-blue/10 border border-exec-blue/20">
            <Database className="w-6 h-6 text-exec-blue" />
          </div>
          <span>Ingesta de <span className="text-exec-blue">Datos</span> &amp; Encuestas</span>
        </h1>
        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
          Centro de carga de indicadores estadísticos externos (INEI, MINEM, Defensoría), encuestas de percepción ciudadana y repositorio de datasets del Observatorio.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-exec-border">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? `border-exec-blue text-white`
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <span className={`material-symbols-outlined notranslate text-base ${activeTab === tab.id ? tab.color : 'text-gray-600'}`} translate="no">{tab.icon}</span>
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'indicators' && <IndicatorsTab />}

      {activeTab === 'surveys_link' && (
        <div className="space-y-4">
          <div className="exec-card bg-[#0A0A0A] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-yellow-400 text-xl" translate="no">poll</span>
                <h3 className="text-sm font-black text-white uppercase tracking-tighter">Centro de Encuestas</h3>
              </div>
              <p className="text-xs text-gray-400 max-w-md">
                Las encuestas de percepción ciudadana se gestionan desde el módulo <strong className="text-white">Encuestas</strong>. 
                Puedes crear encuestas de tipo <em>general</em> para medir confianza institucional, cohesión agraria, percepción de riesgo ambiental y malestar social territorial.
              </p>
            </div>
            <a href="/admin/surveys"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black text-[11px] font-black uppercase tracking-widest rounded-none transition-all">
              <span className="material-symbols-outlined notranslate text-base" translate="no">arrow_forward</span>
              Ir al módulo de Encuestas
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'groups', color: 'text-yellow-400', title: 'Confianza Institucional', desc: 'Mide la percepción de confianza en el IICS, municipalidades y gobierno central entre la población rural.' },
              { icon: 'eco', color: 'text-emerald-400', title: 'Percepción de Riesgo Ambiental', desc: 'Evalúa cómo percibe la población el riesgo ambiental por minería, escasez de agua y pasivos mineros.' },
              { icon: 'sentiment_dissatisfied', color: 'text-red-400', title: 'Índice de Malestar Social', desc: 'Detecta niveles de insatisfacción con servicios básicos, gobernanza local y representatividad política.' },
            ].map(card => (
              <div key={card.title} className="exec-card bg-[#0A0A0A] p-4 space-y-2">
                <span className={`material-symbols-outlined notranslate text-2xl ${card.color}`} translate="no">{card.icon}</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{card.title}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="exec-card bg-yellow-950/10 border-yellow-500/20 p-4">
            <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined notranslate text-base" translate="no">lightbulb</span>
              Cómo conectar encuestas al Observatorio
            </p>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              En el módulo de Encuestas, crea una encuesta de tipo <strong className="text-white">General</strong>. 
              Las encuestas publicadas con <strong className="text-white">is_active = true</strong> aparecerán automáticamente 
              en el tab <strong className="text-white">"Datos & Encuestas"</strong> del Observatorio público, 
              mostrando sus resultados agregados en forma visual.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'datasets' && <DatasetsTab />}
    </div>
  );
};
