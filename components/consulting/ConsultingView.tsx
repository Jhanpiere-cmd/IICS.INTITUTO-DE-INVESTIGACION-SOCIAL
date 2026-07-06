import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import {
  Briefcase, Plus, Trash2, Loader2, X, DollarSign, Save,
  Building2, FileText, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

interface ConsultingProposal {
  id: string;
  title: string;
  client_name: string;
  value: number;
  status: 'Borrador' | 'En Negociación' | 'Aprobada' | 'Rechazada';
  description: string;
  fase: 'No Iniciado' | 'Diseño Metodológico' | 'Trabajo de Campo' | 'Análisis de Datos / NLP' | 'Entregable Final' | 'Completado';
  created_at: string;
}

const EXECUTION_PHASES = [
  'No Iniciado',
  'Diseño Metodológico',
  'Trabajo de Campo',
  'Análisis de Datos / NLP',
  'Entregable Final',
  'Completado'
] as const;

export const ConsultingView: React.FC = () => {
  const { showToast } = useToast();
  const [proposals, setProposals] = useState<ConsultingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ConsultingProposal | null>(null);

  // Form states
  const [newProposal, setNewProposal] = useState({
    title: '',
    client_name: '',
    value: 0,
    description: '',
    fase: 'No Iniciado' as typeof EXECUTION_PHASES[number]
  });

  const [editForm, setEditForm] = useState({
    title: '',
    client_name: '',
    value: 0,
    description: '',
    status: 'Borrador' as 'Borrador' | 'En Negociación' | 'Aprobada' | 'Rechazada',
    fase: 'No Iniciado' as typeof EXECUTION_PHASES[number]
  });

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consulting_proposals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProposals(data || []);
    } catch (e: any) {
      console.error(e);
      showToast({ message: 'Error al cargar propuestas', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposal.title.trim() || !newProposal.client_name.trim()) {
      showToast({ message: 'Por favor complete todos los campos obligatorios.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('consulting_proposals')
        .insert({
          title: newProposal.title,
          client_name: newProposal.client_name,
          value: Number(newProposal.value) || 0,
          description: newProposal.description,
          status: 'Borrador',
          fase: newProposal.fase
        });
      if (error) throw error;
      showToast({ message: '¡Propuesta comercial registrada exitosamente!', type: 'success' });
      setShowAddModal(false);
      setNewProposal({ title: '', client_name: '', value: 0, description: '', fase: 'No Iniciado' });
      loadProposals();
    } catch (e: any) {
      console.error(e);
      showToast({ message: e.message || 'Error al guardar la propuesta', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;
    if (!editForm.title.trim() || !editForm.client_name.trim()) {
      showToast({ message: 'El título y cliente son obligatorios.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const isApproving = editForm.status === 'Aprobada' && selectedProposal.status !== 'Aprobada';

      const { error } = await supabase
        .from('consulting_proposals')
        .update({
          title: editForm.title,
          client_name: editForm.client_name,
          value: Number(editForm.value) || 0,
          description: editForm.description,
          status: editForm.status,
          fase: editForm.fase
        })
        .eq('id', selectedProposal.id);
      if (error) throw error;

      showToast({ message: 'Propuesta comercial actualizada correctamente.', type: 'success' });

      // Inyectar ingreso financiero automáticamente si se aprueba
      if (isApproving && editForm.value > 0) {
        const { error: txError } = await supabase
          .from('financial_transactions')
          .insert({
            title: `Consultoría: ${editForm.title} - ${editForm.client_name}`,
            type: 'income',
            category: 'Consultoría',
            amount: Number(editForm.value),
            description: `Ingreso automático registrado al aprobarse la propuesta de consultoría. Descripción: ${editForm.description || ''}`,
            transaction_date: new Date().toISOString().split('T')[0]
          });
        if (txError) {
          console.error('Error al registrar flujo de caja:', txError);
        } else {
          showToast({ message: `S/ ${editForm.value} inyectados al flujo de caja financiero del Instituto.`, type: 'success' });
        }
      }

      setSelectedProposal(null);
      loadProposals();
    } catch (e: any) {
      console.error(e);
      showToast({ message: e.message || 'Error al actualizar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (!confirm('¿Desea eliminar esta propuesta permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('consulting_proposals')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast({ message: 'Propuesta comercial eliminada.', type: 'success' });
      setSelectedProposal(null);
      loadProposals();
    } catch (e: any) {
      console.error(e);
      showToast({ message: 'Error al eliminar la propuesta', type: 'error' });
    }
  };

  const openEditModal = (proposal: ConsultingProposal) => {
    setSelectedProposal(proposal);
    setEditForm({
      title: proposal.title,
      client_name: proposal.client_name,
      value: proposal.value || 0,
      description: proposal.description || '',
      status: proposal.status,
      fase: proposal.fase || 'No Iniciado'
    });
  };

  const columns = [
    { id: 'Borrador', title: 'Borradores / Solicitudes', border: 'border-zinc-800', text: 'text-zinc-400', bg: 'bg-zinc-950/40' },
    { id: 'En Negociación', title: 'En Negociación', border: 'border-amber-900/30', text: 'text-amber-400', bg: 'bg-amber-950/20' },
    { id: 'Aprobada', title: 'Proyectos Aprobados', border: 'border-green-900/30', text: 'text-emerald-400', bg: 'bg-emerald-950/20' },
    { id: 'Rechazada', title: 'Rechazadas', border: 'border-red-900/30', text: 'text-red-400', bg: 'bg-red-950/20' }
  ] as const;

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-8 pt-0 md:pt-4 md:px-6 space-y-5 text-left">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-none border border-cyan-500/20">
              <Briefcase className="text-cyan-400 h-6 w-6" />
            </div>
            <span>Proyectos y <span className="text-cyan-400">Sostenibilidad</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
            CRM de propuestas comerciales, valorización de servicios e inyección financiera.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-none text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Propuesta
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {columns.map(col => {
            const colProps = proposals.filter(p => p.status === col.id);
            const colTotal = colProps.reduce((sum, p) => sum + Number(p.value || 0), 0);

            return (
              <div key={col.id} className={`bg-[#050506] border ${col.border} flex flex-col min-h-[500px]`}>
                <div className={`p-4 border-b border-zinc-900 ${col.bg} flex justify-between items-center`}>
                  <div>
                    <h3 className={`text-[11px] font-black uppercase tracking-widest ${col.text}`}>{col.title}</h3>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{colProps.length} propuestas</p>
                  </div>
                  <span className="text-xs font-black text-white font-mono">S/ {colTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  {colProps.map(p => (
                    <div
                      key={p.id}
                      onClick={() => openEditModal(p)}
                      className="bg-black border border-zinc-900 hover:border-zinc-700 p-4 space-y-3 transition-colors cursor-pointer group text-left relative"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider line-clamp-2 pr-4">{p.title}</h4>
                        <span className="absolute top-4 right-4 text-[9px] text-zinc-500 font-mono">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider block">Cliente</span>
                        <span className="text-xs text-zinc-300 uppercase font-bold">{p.client_name}</span>
                      </div>

                      {p.description && (
                        <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed font-sans">{p.description}</p>
                      )}

                      <div className="flex justify-between items-end pt-3 border-t border-zinc-900">
                        <div>
                          <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider block">Valorización</span>
                          <span className={`text-xs font-black font-mono ${Number(p.value) === 0 ? 'text-amber-500 animate-pulse' : 'text-white'}`}>
                            {Number(p.value) === 0 ? 'Pendiente' : `S/ ${Number(p.value).toLocaleString('es-PE')}`}
                          </span>
                        </div>
                        {p.status === 'Aprobada' && (
                          <div className="text-right">
                            <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider block">Fase de Ejecución</span>
                            <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded-none bg-emerald-950/20 border border-emerald-900/30 text-emerald-400">
                              {p.fase || 'No Iniciado'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {colProps.length === 0 && (
                    <div className="py-12 text-center text-[10px] text-zinc-600 font-mono uppercase border border-dashed border-zinc-900">
                      Sin registros
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: REGISTRAR PROPUESTA MANUAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-zinc-900 rounded-none w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-900 bg-black flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Registrar Propuesta de Consultoría
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProposal} className="p-5 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Título del Requerimiento / Proyecto *</label>
                <input
                  type="text"
                  required
                  value={newProposal.title}
                  onChange={e => setNewProposal({ ...newProposal, title: e.target.value })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none focus:border-cyan-500 rounded-none uppercase"
                  placeholder="Ej. Catastro SIG Hualgayoc"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Cliente / Empresa Solicitante *</label>
                <input
                  type="text"
                  required
                  value={newProposal.client_name}
                  onChange={e => setNewProposal({ ...newProposal, client_name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none focus:border-cyan-500 rounded-none uppercase"
                  placeholder="Ej. Minera Michiquillay"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Valorización (S/.) (Opcional)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProposal.value || ''}
                    onChange={e => setNewProposal({ ...newProposal, value: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none focus:border-cyan-500 rounded-none font-mono"
                    placeholder="Dejar 0 si está pendiente"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Fase de Ejecución</label>
                  <select
                    value={newProposal.fase}
                    onChange={e => setNewProposal({ ...newProposal, fase: e.target.value as any })}
                    className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none cursor-pointer rounded-none"
                  >
                    {EXECUTION_PHASES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Descripción del Alcance / Requerimiento</label>
                <textarea
                  value={newProposal.description}
                  onChange={e => setNewProposal({ ...newProposal, description: e.target.value })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 h-24 outline-none focus:border-cyan-500 rounded-none resize-none"
                  placeholder="Detalles clave del servicio..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-[10px] uppercase font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[10px] uppercase font-black cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Registrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EVALUAR / EDITAR PROPUESTA RECIBIDA ── */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-zinc-900 rounded-none w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-900 bg-black flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" /> Evaluar Propuesta Comercial
              </h3>
              <button onClick={() => setSelectedProposal(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateProposal} className="p-5 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Título del Requerimiento / Proyecto *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none focus:border-cyan-500 rounded-none uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Cliente / Empresa Solicitante *</label>
                <input
                  type="text"
                  required
                  value={editForm.client_name}
                  onChange={e => setEditForm({ ...editForm, client_name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none focus:border-cyan-500 rounded-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Valorización (Precio en S/.) *</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.value || ''}
                    onChange={e => setEditForm({ ...editForm, value: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none focus:border-cyan-500 rounded-none font-mono"
                    placeholder="Ej. 18500"
                  />
                  {editForm.value === 0 && (
                    <span className="text-[8px] text-amber-500 block font-mono">⚠️ Asigne un precio para la negociación o aprobación.</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Estado del Negocio</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none cursor-pointer rounded-none"
                  >
                    <option value="Borrador">Borrador / Solicitud</option>
                    <option value="En Negociación">En Negociación</option>
                    <option value="Aprobada">Aprobada / Proyecto Iniciado</option>
                    <option value="Rechazada">Rechazada</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Fase de Ejecución (Solo Proyectos Aprobados)</label>
                <select
                  value={editForm.fase}
                  disabled={editForm.status !== 'Aprobada'}
                  onChange={e => setEditForm({ ...editForm, fase: e.target.value as any })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 outline-none cursor-pointer rounded-none disabled:opacity-40"
                >
                  {EXECUTION_PHASES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Descripción del Alcance / Requerimiento</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-black border border-zinc-800 text-white text-xs p-2.5 h-24 outline-none focus:border-cyan-500 rounded-none resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => handleDeleteProposal(selectedProposal.id)}
                  className="flex items-center gap-1 text-red-500 hover:text-white transition-colors cursor-pointer uppercase font-mono text-[9px] font-bold"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProposal(null)}
                    className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-[10px] uppercase font-bold cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[10px] uppercase font-black cursor-pointer flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultingView;
