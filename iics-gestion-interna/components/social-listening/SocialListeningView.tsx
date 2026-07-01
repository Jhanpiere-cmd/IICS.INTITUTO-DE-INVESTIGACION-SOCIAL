import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  Plus, Edit3, Trash2, X, Loader2, Search,
  Filter, Globe, Radio, Smartphone, Tv2, MessageCircle
} from 'lucide-react';

/* ─── Types ─── */
interface SocialPost {
  id: string;
  author: string;
  content: string;
  topic: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  source: string;
  province: string;
  published_at: string;
  created_at: string;
  status: string;
}

/* ─── Constants ─── */
const TOPICS = [
  { id: 'mineria',        label: 'Minería y Medio Ambiente' },
  { id: 'gobernabilidad', label: 'Gobernabilidad' },
  { id: 'cohesion',       label: 'Cohesión Social' },
  { id: 'servicios',      label: 'Servicios Básicos' },
  { id: 'otro',           label: 'Otro' },
];

const SOURCES = [
  { id: 'facebook',   label: 'Facebook',    icon: 'thumb_up' },
  { id: 'twitter',    label: 'X / Twitter', icon: 'tag' },
  { id: 'whatsapp',   label: 'WhatsApp',    icon: 'chat' },
  { id: 'radio',      label: 'Radio Local', icon: 'radio' },
  { id: 'periodico',  label: 'Periódico',   icon: 'newspaper' },
  { id: 'otro',       label: 'Otro medio',  icon: 'language' },
];

const PROVINCES = [
  'San Ignacio','Jaén','Cutervo','Chota','Santa Cruz',
  'Hualgayoc','Celendín','San Miguel','San Pablo',
  'Cajamarca','Contumazá','San Marcos','Cajabamba'
];

const sentimentCfg = {
  positive: { badge: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30', dot: 'bg-emerald-500', label: 'Positivo' },
  neutral:  { badge: 'text-amber-400 bg-amber-950/20 border-amber-900/30',       dot: 'bg-amber-400',   label: 'Neutro'   },
  negative: { badge: 'text-red-400 bg-red-950/20 border-red-900/30',             dot: 'bg-red-500',     label: 'Negativo' },
};

const sourceIcon = (src: string) =>
  SOURCES.find(s => s.id === src)?.icon || 'language';

const emptyForm = {
  author:       '',
  content:      '',
  topic:        'mineria',
  sentiment:    'neutral' as 'positive' | 'neutral' | 'negative',
  source:       'facebook',
  province:     'Cajamarca',
  published_at: new Date().toISOString().slice(0, 16),
  status:       'published',
};

/* ─── Component ─── */
export const SocialListeningView: React.FC = () => {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<SocialPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_listening')
        .select('*')
        .order('published_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (e) {
      console.error('Error loading social_listening:', e);
      showToast({ message: 'Error al cargar el monitoreo de medios.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (post: SocialPost) => {
    setEditingPost(post);
    setForm({
      author:       post.author,
      content:      post.content,
      topic:        post.topic,
      sentiment:    post.sentiment,
      source:       post.source,
      province:     post.province,
      published_at: post.published_at
        ? new Date(post.published_at).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      status:       post.status,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author.trim() || !form.content.trim()) {
      showToast({ message: 'Fuente y contenido son requeridos.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        author:       form.author.trim(),
        content:      form.content.trim(),
        topic:        form.topic,
        sentiment:    form.sentiment,
        source:       form.source,
        province:     form.province,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString(),
        status:       form.status,
        updated_at:   new Date().toISOString(),
      };
      if (editingPost) {
        const { error } = await supabase.from('social_listening').update(payload).eq('id', editingPost.id);
        if (error) throw error;
        showToast({ message: 'Monitoreo actualizado correctamente.', type: 'success' });
      } else {
        const { error } = await supabase.from('social_listening').insert(payload);
        if (error) throw error;
        showToast({ message: '¡Entrada registrada! Aparecerá en el Observatorio → Analítica.', type: 'success' });
      }
      setShowModal(false);
      fetchPosts();
    } catch (e: any) {
      showToast({ message: e.message || 'Error al guardar.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;
    try {
      const { error } = await supabase.from('social_listening').delete().eq('id', postToDelete.id);
      if (error) throw error;
      showToast({ message: 'Entrada eliminada.', type: 'success' });
      setPostToDelete(null);
      fetchPosts();
    } catch (e: any) {
      showToast({ message: e.message || 'Error al eliminar.', type: 'error' });
    }
  };

  /* ── Computed ── */
  const positive = posts.filter(p => p.sentiment === 'positive').length;
  const negative = posts.filter(p => p.sentiment === 'negative').length;
  const neutral  = posts.filter(p => p.sentiment === 'neutral').length;
  const total    = posts.length;

  const filtered = posts.filter(p => {
    const matchSearch = !searchTerm ||
      p.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.province.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTopic     = filterTopic     === 'all' || p.topic     === filterTopic;
    const matchSentiment = filterSentiment === 'all' || p.sentiment === filterSentiment;
    const matchSource    = filterSource    === 'all' || p.source    === filterSource;
    return matchSearch && matchTopic && matchSentiment && matchSource;
  });

  const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negativeRate = total > 0 ? Math.round((negative / total) * 100) : 0;
  const neutralRate  = total > 0 ? Math.round((neutral  / total) * 100) : 0;

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/10 rounded-none border border-emerald-500/20">
              <span className="material-symbols-outlined notranslate text-emerald-400 text-2xl leading-none" translate="no">
                manage_search
              </span>
            </div>
            <span>Escucha <span className="text-emerald-400">Social</span> &amp; Medios</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Monitoreo de redes sociales, medios locales y narrativas emergentes del territorio cajamarquino.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Monitoreo
        </button>
      </div>

      {/* ═══ SENTIMENT OVERVIEW CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A]">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Total Entradas</h3>
            <span className="material-symbols-outlined notranslate text-emerald-400 text-xl" translate="no">rss_feed</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{total}</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400/70 mt-1 uppercase font-bold">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">database</span>
              en monitoreo
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] hover:border-emerald-500/30 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Positivo</h3>
            <span className="material-symbols-outlined notranslate text-emerald-400 text-xl" translate="no">sentiment_satisfied</span>
          </div>
          <div>
            <p className="text-3xl font-light text-emerald-400">{positiveRate}%</p>
            <div className="w-full h-1 bg-exec-border mt-2 rounded-none overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${positiveRate}%` }}></div>
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] hover:border-amber-400/30 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Neutro</h3>
            <span className="material-symbols-outlined notranslate text-amber-400 text-xl" translate="no">sentiment_neutral</span>
          </div>
          <div>
            <p className="text-3xl font-light text-amber-400">{neutralRate}%</p>
            <div className="w-full h-1 bg-exec-border mt-2 rounded-none overflow-hidden">
              <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${neutralRate}%` }}></div>
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] hover:border-red-500/30 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Negativo</h3>
            <span className="material-symbols-outlined notranslate text-red-400 text-xl" translate="no">sentiment_dissatisfied</span>
          </div>
          <div>
            <p className="text-3xl font-light text-red-400">{negativeRate}%</p>
            <div className="w-full h-1 bg-exec-border mt-2 rounded-none overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${negativeRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SENTIMENT BAR GLOBAL ═══ */}
      {total > 0 && (
        <div className="exec-card bg-[#0A0A0A] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Distribución Global de Sentimientos</p>
            <span className="text-[9px] font-mono text-gray-600">{total} entradas analizadas</span>
          </div>
          <div className="w-full h-3 flex overflow-hidden bg-exec-border">
            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${positiveRate}%` }} title={`Positivo ${positiveRate}%`} />
            <div className="bg-amber-400 h-full transition-all duration-700"  style={{ width: `${neutralRate}%`  }} title={`Neutro ${neutralRate}%`} />
            <div className="bg-red-500 h-full transition-all duration-700"    style={{ width: `${negativeRate}%` }} title={`Negativo ${negativeRate}%`} />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] font-mono">
            <span className="text-emerald-400">✓ Positivo {positiveRate}%</span>
            <span className="text-amber-400">— Neutro {neutralRate}%</span>
            <span className="text-red-400">✗ Negativo {negativeRate}%</span>
          </div>
        </div>
      )}

      {/* ═══ FILTROS ═══ */}
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por fuente, contenido o provincia..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-exec-border text-white text-xs pl-9 pr-4 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-500 hidden md:block" />
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
            className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] font-bold uppercase px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">Todos los tópicos</option>
            {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)}
            className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] font-bold uppercase px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">Todo sentimiento</option>
            <option value="positive">Positivo</option>
            <option value="neutral">Neutro</option>
            <option value="negative">Negativo</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="bg-[#0A0A0A] border border-exec-border text-gray-300 text-[11px] font-bold uppercase px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="all">Todas las fuentes</option>
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* ═══ FEED DE MONITOREO ═══ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-exec-border border-t-emerald-500"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Cargando monitoreo de medios...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-12 bg-[#0A0A0A] border border-exec-border">
          <span className="material-symbols-outlined notranslate text-gray-700 text-5xl mb-3 block" translate="no">manage_search</span>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            {posts.length === 0 ? 'Sin entradas de monitoreo' : 'Sin resultados para los filtros aplicados'}
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-600 mt-1 max-w-sm mx-auto">
            {posts.length === 0
              ? 'Registra la primera señal de escucha social para alimentar el Observatorio.'
              : 'Ajusta los filtros o el término de búsqueda.'}
          </p>
          {posts.length === 0 && (
            <button onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all">
              <Plus className="w-4 h-4" /> Primera entrada
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(post => {
            const cfg = sentimentCfg[post.sentiment] || sentimentCfg.neutral;
            return (
              <div key={post.id}
                className="exec-card bg-[#0A0A0A] p-4 flex flex-col gap-3 hover:border-gray-700 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined notranslate text-gray-500 text-base flex-shrink-0" translate="no">
                      {sourceIcon(post.source)}
                    </span>
                    <span className="text-xs font-bold text-white font-mono truncate">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border rounded-none ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <button onClick={() => handleOpenEdit(post)}
                      className="text-gray-600 hover:text-white transition-colors cursor-pointer">
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => setPostToDelete(post)}
                      className="text-red-600 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-[11.5px] text-zinc-300 leading-relaxed font-sans line-clamp-3">{post.content}</p>

                {/* Meta */}
                <div className="flex items-center justify-between pt-2 border-t border-exec-border/50 text-[9px] font-mono">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="uppercase">{TOPICS.find(t => t.id === post.topic)?.label.slice(0, 12) || post.topic}</span>
                    <span>•</span>
                    <span className="text-exec-blue">{post.province}</span>
                  </div>
                  <span className="text-gray-600">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '–'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-exec-border">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-emerald-400 text-xl" translate="no">manage_search</span>
                {editingPost ? 'Editar Entrada' : 'Registrar Monitoreo Social'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 text-left">

              {/* Source + Author */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Canal / Fuente <span className="text-red-400">*</span>
                  </label>
                  <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
                    {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Autor / Medio <span className="text-red-400">*</span>
                  </label>
                  <input type="text" required value={form.author}
                    onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                    placeholder="@usuario, Radio Hualgayoc, etc."
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                  Contenido / Narrativa <span className="text-red-400">*</span>
                </label>
                <textarea required value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Texto del post, declaración, titular del medio o resumen de la narrativa detectada..."
                  rows={4}
                  className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 resize-none" />
              </div>

              {/* Topic + Sentiment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Tópico</label>
                  <select value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
                    {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Sentimiento</label>
                  <select value={form.sentiment}
                    onChange={e => setForm(p => ({ ...p, sentiment: e.target.value as any }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
                    <option value="positive">Positivo</option>
                    <option value="neutral">Neutro</option>
                    <option value="negative">Negativo</option>
                  </select>
                </div>
              </div>

              {/* Province + Date + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Provincia</label>
                  <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Fecha / Hora</label>
                  <input type="datetime-local" value={form.published_at}
                    onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Estado</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-black border border-exec-border text-gray-300 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-emerald-500 cursor-pointer">
                    <option value="published">Publicado</option>
                    <option value="draft">Borrador</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-exec-border/50">
                <button type="button" onClick={() => setShowModal(false)}
                  className="bg-transparent hover:bg-white/5 border border-exec-border text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-none transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-none transition-colors cursor-pointer shadow-lg shadow-emerald-600/20">
                  {isSaving && <Loader2 size={12} className="animate-spin" />}
                  {editingPost ? 'Guardar Cambios' : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ CONFIRM DELETE ═══ */}
      {postToDelete && (
        <ConfirmModal
          isOpen={!!postToDelete}
          title="¿Eliminar entrada?"
          message={`La entrada de "${postToDelete.author}" será eliminada permanentemente y desaparecerá del Observatorio.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleDelete}
          onCancel={() => setPostToDelete(null)}
        />
      )}
    </div>
  );
};
