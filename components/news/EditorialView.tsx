import React, { useEffect, useState } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Upload,
  Loader2,
  GraduationCap,
  Inbox,
  Download,
  Send,
  Plus,
  Trash2,
  BookOpen
} from 'lucide-react';
import { useToast } from '../ui/ToastContext';

interface Publication {
  id: string;
  title: string;
  authors: string;
  published_date: string | null;
  research_line: string | null;
  pdf_url: string | null;
  url: string | null;
  abstract: string | null;
  keywords: string | null;
  rights: string | null;
  volume: string | null;
  number: string | null;
  created_at: string;
}

interface DraftSubmission {
  id: string;
  title: string;
  abstract: string | null;
  author_name: string;
  author_email: string;
  institution: string | null;
  research_line: string;
  pdf_url: string | null;
  status: 'Recibido' | 'En Dictamen' | 'Aprobado' | 'Rechazado';
  submitted_at: string;
}

export const EditorialView: React.FC = () => {
  const { showToast } = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState<'publications' | 'inbox'>('publications');

  // --- TAB 1: PUBLICACIONES STATES (Dublin Core) ---
  const [publicationsList, setPublicationsList] = useState<Publication[]>([]);
  const [loadingPubs, setLoadingPubs] = useState(true);
  const [showCreatePub, setShowCreatePub] = useState(false);
  const [pubForm, setPubForm] = useState({
    title: '',
    authors: '',
    published_date: '',
    research_line: 'Sociología Digital y Nuevas Tecnologías',
    url: '',
    abstract: '',
    keywords: '',
    rights: 'Creative Commons Attribution 4.0',
    volume: '',
    number: ''
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pubUploading, setPubUploading] = useState(false);
  const [showConfirmDeletePub, setShowConfirmDeletePub] = useState<string | null>(null);

  // --- TAB 2: BANDEJA DE ENTRADA STATES ---
  const [submissionsList, setSubmissionsList] = useState<DraftSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [dictamenTarget, setDictamenTarget] = useState<DraftSubmission | null>(null);
  const [newDictamenStatus, setNewDictamenStatus] = useState<'Recibido' | 'En Dictamen' | 'Aprobado' | 'Rechazado'>('Recibido');
  const [updatingDictamen, setUpdatingDictamen] = useState(false);

  // --- LOAD INITIAL DATA ---
  useEffect(() => {
    if (activeTab === 'publications') {
      loadPublications();
    } else if (activeTab === 'inbox') {
      loadSubmissions();
    }
  }, [activeTab]);

  // --- TAB 1: PUBLICACIONES LOGIC ---
  const loadPublications = async () => {
    setLoadingPubs(true);
    try {
      const { data, error } = await supabase
        .from('journal_publications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPublicationsList(data || []);
    } catch (e) {
      console.error('Error al cargar publicaciones:', e);
      showToast({ message: 'Error al cargar catálogo', type: 'error' });
    } finally {
      setLoadingPubs(false);
    }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleCreatePublication = async () => {
    if (!pubForm.title.trim() || !pubForm.authors.trim()) {
      showToast({ message: 'El título y autores son campos requeridos.', type: 'error' });
      return;
    }
    setPubUploading(true);
    try {
      let finalPdfUrl = pubForm.url || null;
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `publications/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, pdfFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
        finalPdfUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('journal_publications').insert({
        title: pubForm.title,
        authors: pubForm.authors,
        published_date: pubForm.published_date || null,
        research_line: pubForm.research_line,
        pdf_url: finalPdfUrl,
        url: pubForm.url || null,
        abstract: pubForm.abstract || null,
        keywords: pubForm.keywords || null,
        rights: pubForm.rights || null,
        volume: pubForm.volume || null,
        number: pubForm.number || null
      });
      if (error) throw error;

      showToast({ message: '¡Artículo indexado correctamente!', type: 'success' });
      setPubForm({
        title: '',
        authors: '',
        published_date: '',
        research_line: 'Sociología Digital y Nuevas Tecnologías',
        url: '',
        abstract: '',
        keywords: '',
        rights: 'Creative Commons Attribution 4.0',
        volume: '',
        number: ''
      });
      setPdfFile(null);
      setShowCreatePub(false);
      loadPublications();
    } catch (e: any) {
      console.error('Error al indexar publicación:', e);
      showToast({ message: e.message || 'Error al indexar', type: 'error' });
    } finally {
      setPubUploading(false);
    }
  };

  const deletePublication = async (id: string) => {
    try {
      const { error } = await supabase.from('journal_publications').delete().eq('id', id);
      if (error) throw error;
      showToast({ message: 'Publicación removida del índice.', type: 'success' });
      loadPublications();
    } catch (e: any) {
      console.error('Error al borrar publicación:', e);
      showToast({ message: e.message || 'Error al borrar', type: 'error' });
    }
  };

  // --- TAB 2: BANDEJA DE ENTRADA LOGIC ---
  const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('research_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setSubmissionsList(data || []);
    } catch (e) {
      console.error('Error al cargar la bandeja de entrada:', e);
      showToast({ message: 'Error al consultar bandeja', type: 'error' });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleDictaminar = async () => {
    if (!dictamenTarget) return;
    setUpdatingDictamen(true);
    try {
      const { error } = await supabase
        .from('research_submissions')
        .update({ status: newDictamenStatus })
        .eq('id', dictamenTarget.id);
      if (error) throw error;
      showToast({ message: `Borrador dictaminado como: ${newDictamenStatus}`, type: 'success' });
      setDictamenTarget(null);
      loadSubmissions();
    } catch (e: any) {
      console.error('Error al dictaminar borrador:', e);
      showToast({ message: e.message || 'Error al guardar dictamen', type: 'error' });
    } finally {
      setUpdatingDictamen(false);
    }
  };

  const startPublicationFromApprovedDraft = (draft: DraftSubmission) => {
    setPubForm({
      title: draft.title,
      authors: draft.author_name,
      published_date: new Date().toISOString().substring(0, 10),
      research_line: draft.research_line || 'Sociología Digital y Nuevas Tecnologías',
      url: draft.pdf_url || '',
      abstract: draft.abstract || '',
      keywords: '',
      rights: 'Creative Commons Attribution 4.0',
      volume: '',
      number: ''
    });
    setActiveTab('publications');
    setShowCreatePub(true);
  };

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-8 pt-0 md:pt-4 md:px-6 space-y-5 text-left">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-none border border-cyan-500/20">
              <BookOpen className="text-cyan-400 h-6 w-6" />
            </div>
            <span>Gestión <span className="text-cyan-400">Editorial</span> y Publicaciones</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Administra artículos científicos indexados, metadatos Dublin Core y bandeja de manuscritos pre-prints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'publications' && (
            <button
              onClick={() => setShowCreatePub(true)}
              className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Indexar Artículo
            </button>
          )}
        </div>
      </div>

      {/* ═══ TABS SELECTOR ═══ */}
      <div className="flex items-center gap-1 bg-[#0A0A0A] border border-exec-border rounded-none p-1 overflow-x-auto whitespace-nowrap scrollbar-hide w-full lg:w-auto">
        <button
          onClick={() => setActiveTab('publications')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap cursor-pointer ${
            activeTab === 'publications' ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <GraduationCap size={14} />
          <span>Artículos y Dublin Core</span>
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap cursor-pointer relative ${
            activeTab === 'inbox' ? 'bg-exec-blue text-white shadow-lg shadow-exec-blue/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Inbox size={14} />
          <span>Bandeja de Manuscritos</span>
        </button>
      </div>

      {/* VISTAS DE PESTAÑAS */}
      {activeTab === 'publications' && (
        <div className="space-y-6">
          {loadingPubs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
            </div>
          ) : publicationsList.length === 0 ? (
            <div className="text-center p-12 bg-black/40 border border-gray-900 font-mono text-xs text-gray-500">
              NO SE ENCONTRARON ARTÍCULOS CIENTÍFICOS REGISTRADOS.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-900 bg-[#050506]">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-gray-900 bg-black text-gray-500 font-mono text-[9px] uppercase tracking-wider">
                    <th className="p-3">Título / Línea</th>
                    <th className="p-3">Autores</th>
                    <th className="p-3">Indexación (Vol/Nº)</th>
                    <th className="p-3">Dublin Core</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-950">
                  {publicationsList.map((pub) => (
                    <tr key={pub.id} className="hover:bg-zinc-950/30">
                      <td className="p-3">
                        <div className="font-bold text-white uppercase tracking-tight">{pub.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{pub.research_line}</div>
                      </td>
                      <td className="p-3 text-gray-300 font-normal">{pub.authors}</td>
                      <td className="p-3 text-gray-400 font-mono">
                        {pub.published_date ? new Date(pub.published_date).getFullYear() : 'N/A'} {pub.volume && `(${pub.volume})`} {pub.number && `No.${pub.number}`}
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 text-[8.5px] font-mono bg-green-950/30 text-green-400 border border-green-900/30">
                          {pub.rights ? 'Dublin Core OK' : 'Estándar'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {pub.pdf_url && (
                            <a
                              href={pub.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-[#111] border border-gray-850 text-gray-400 hover:text-white"
                              title="Bajar PDF"
                            >
                              <Download size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => setShowConfirmDeletePub(pub.id)}
                            className="p-1 border border-gray-850 hover:border-red-900 text-gray-400 hover:text-red-500 cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="space-y-6">
          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-exec-blue" />
            </div>
          ) : submissionsList.length === 0 ? (
            <div className="text-center p-12 bg-black/40 border border-gray-900 font-mono text-xs text-gray-500">
              LA BANDEJA DE PRE-PRINTS ESTÁ VACÍA.
            </div>
          ) : (
            <div className="space-y-3">
              {submissionsList.map((sub) => (
                <div key={sub.id} className="bg-[#050506] border border-gray-900 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                  <div className="space-y-1.5 font-sans">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded-none border ${
                        sub.status === 'Recibido' ? 'bg-zinc-950 text-gray-400 border-gray-800' :
                        sub.status === 'En Dictamen' ? 'bg-amber-955/40 text-amber-500 border-amber-900/60' :
                        sub.status === 'Aprobado' ? 'bg-green-955/40 text-green-400 border-green-900/60' :
                        'bg-red-955/40 text-red-400 border-red-900/60'
                      }`}>
                        {sub.status}
                      </span>
                      <span className="text-[9.5px] font-mono text-gray-550">Recibido: {new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight leading-snug">{sub.title}</h4>
                    <p className="text-[11px] text-gray-400">
                      <span className="font-bold text-gray-300">Autor:</span> {sub.author_name} ({sub.author_email}) • <span className="font-bold text-gray-300">Filiación:</span> {sub.institution || 'Independiente'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Línea: {sub.research_line}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {sub.pdf_url && (
                      <a
                        href={sub.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-black hover:bg-zinc-950 border border-gray-850 hover:border-gray-700 text-gray-300 rounded-none font-mono text-[10.5px] flex items-center gap-1.5"
                      >
                        <Download size={12} />
                        <span>Bajar PDF</span>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setDictamenTarget(sub);
                        setNewDictamenStatus(sub.status);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-gray-300 border border-zinc-850 hover:border-zinc-700 rounded-none font-mono text-[10.5px] cursor-pointer"
                    >
                      Dictaminar
                    </button>

                    {sub.status === 'Aprobado' && (
                      <button
                        onClick={() => startPublicationFromApprovedDraft(sub)}
                        className="px-3 py-1.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-mono text-[10.5px] flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={12} />
                        <span>Publicar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Modal: Indexar Artículo */}
      {showCreatePub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-exec-blue" />
                <span>Indexar Publicación Científica</span>
              </h3>
              <button onClick={() => setShowCreatePub(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Título del Artículo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dinámicas territoriales y conflictos en la cuenca del Sendamal..."
                  value={pubForm.title}
                  onChange={(e) => setPubForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Autores *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Jaime Abanto P., Ana Díaz L."
                    value={pubForm.authors}
                    onChange={(e) => setPubForm(prev => ({ ...prev, authors: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Línea de Investigación</label>
                  <select
                    value={pubForm.research_line}
                    onChange={(e) => setPubForm(prev => ({ ...prev, research_line: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  >
                    <option value="Sociología Digital y Nuevas Tecnologías">Sociología Digital</option>
                    <option value="Transformación Social y Desarrollo Regional">Transformación Social</option>
                    <option value="Educación y Juventudes">Educación y Juventudes</option>
                    <option value="Género y Cambio Cultural">Género y Cambio Cultural</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Volumen</label>
                  <input
                    type="text"
                    placeholder="Ej. Vol. 2"
                    value={pubForm.volume}
                    onChange={(e) => setPubForm(prev => ({ ...prev, volume: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Número</label>
                  <input
                    type="text"
                    placeholder="Ej. Nº 1"
                    value={pubForm.number}
                    onChange={(e) => setPubForm(prev => ({ ...prev, number: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Fecha Publicación</label>
                  <input
                    type="date"
                    value={pubForm.published_date}
                    onChange={(e) => setPubForm(prev => ({ ...prev, published_date: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-955 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Subir Archivo PDF</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelect}
                    className="w-full bg-black border border-gray-855 p-1.5 text-white outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">O URL Alternativa</label>
                  <input
                    type="text"
                    placeholder="Ej. https://doi.org/10..."
                    value={pubForm.url}
                    onChange={(e) => setPubForm(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-gray-550 uppercase block">Resumen / Abstract (Metadatos Dublin Core)</label>
                <textarea
                  rows={4}
                  placeholder="Escriba la síntesis o resumen del artículo..."
                  value={pubForm.abstract}
                  onChange={(e) => setPubForm(prev => ({ ...prev, abstract: e.target.value }))}
                  className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-955 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Palabras Clave</label>
                  <input
                    type="text"
                    placeholder="Ej. conflictos, sociología, Cajamarca"
                    value={pubForm.keywords}
                    onChange={(e) => setPubForm(prev => ({ ...prev, keywords: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Derechos / Licencia</label>
                  <input
                    type="text"
                    value={pubForm.rights}
                    onChange={(e) => setPubForm(prev => ({ ...prev, rights: e.target.value }))}
                    className="w-full bg-black border border-gray-855 p-2 text-white outline-none focus:border-exec-blue"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setShowCreatePub(false)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white hover:bg-zinc-950 font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePublication}
                disabled={pubUploading}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {pubUploading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{pubUploading ? 'Indexando...' : 'Indexar Artículo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dialog: Dictaminar manuscrito */}
      {dictamenTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#050506] border border-gray-900 w-full max-w-sm p-6 space-y-4 text-left font-sans text-xs">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dictaminar Borrador</h3>
              <p className="text-[10px] text-gray-550 font-mono mt-1 leading-normal line-clamp-2 uppercase">Tema: {dictamenTarget.title}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-gray-555 uppercase block">Seleccione el estado del Dictamen</label>
              <select
                value={newDictamenStatus}
                onChange={(e) => setNewDictamenStatus(e.target.value as any)}
                className="w-full bg-black border border-gray-855 p-2 text-white outline-none cursor-pointer"
              >
                <option value="Recibido">Recibido (En cola)</option>
                <option value="En Dictamen">En Dictamen (Revisión de Pares)</option>
                <option value="Aprobado">Aprobado (Listo para publicación)</option>
                <option value="Rechazado">Rechazado (No califica)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-900">
              <button
                onClick={() => setDictamenTarget(null)}
                className="px-4 py-2 border border-gray-855 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDictaminar}
                disabled={updatingDictamen}
                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {updatingDictamen ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : null}
                <span>{updatingDictamen ? 'Guardando...' : 'Aplicar Dictamen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIONES */}
      <ConfirmModal
        isOpen={showConfirmDeletePub !== null}
        title="¿REMOVER PUBLICACIÓN?"
        message="Esta acción retirará el artículo científico del catálogo público del Observatorio. ¿Desea continuar?"
        confirmText="Remover de Indexación"
        cancelText="Cancelar"
        onConfirm={() => {
          if (showConfirmDeletePub) {
            deletePublication(showConfirmDeletePub);
            setShowConfirmDeletePub(null);
          }
        }}
        onCancel={() => setShowConfirmDeletePub(null)}
      />
    </div>
  );
};

export default EditorialView;
