import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  Video, 
  Tag, 
  Calendar, 
  User, 
  Clock, 
  X, 
  Upload, 
  Image as ImageIcon,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface TransmediaVideo {
  id: string;
  title: string;
  duration: string;
  year: string;
  tags: string[];
  desc: string;
  thumbnail_url: string;
  video_url: string;
  authors: string;
  created_at: string;
}

export const TransmediaView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [videos, setVideos] = useState<TransmediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TransmediaVideo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    title: '',
    duration: '',
    year: new Date().getFullYear().toString(),
    tagsString: '',
    desc: '',
    video_url: '',
    authors: ''
  });

  // Delete confirm state
  const [videoToDelete, setVideoToDelete] = useState<TransmediaVideo | null>(null);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transmedia_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err: any) {
      console.error('Error al cargar videos transmedia:', err);
      showToast({ message: 'Error al cargar los videos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleOpenAdd = () => {
    setEditingVideo(null);
    setForm({
      title: '',
      duration: '',
      year: new Date().getFullYear().toString(),
      tagsString: '',
      desc: '',
      video_url: '',
      authors: ''
    });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (video: TransmediaVideo) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      duration: video.duration || '',
      year: video.year || '',
      tagsString: video.tags ? video.tags.join(', ') : '',
      desc: video.desc || '',
      video_url: video.video_url || '',
      authors: video.authors || ''
    });
    setImageFile(null);
    setImagePreview(video.thumbnail_url || null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast({ message: 'El título es obligatorio.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      let finalThumbnailUrl = editingVideo?.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';

      // 1. Subir miniatura si se seleccionó un archivo nuevo
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `transmedia/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);
        finalThumbnailUrl = urlData.publicUrl;
      }

      // 2. Procesar etiquetas
      const tags = form.tagsString
        ? form.tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

      const videoPayload = {
        title: form.title,
        duration: form.duration,
        year: form.year,
        tags,
        desc: form.desc,
        video_url: form.video_url,
        authors: form.authors,
        thumbnail_url: finalThumbnailUrl
      };

      if (editingVideo) {
        // Actualizar existente
        const { error } = await supabase
          .from('transmedia_videos')
          .update(videoPayload)
          .eq('id', editingVideo.id);

        if (error) throw error;
        showToast({ message: 'Video actualizado con éxito.', type: 'success' });
      } else {
        // Insertar nuevo
        const { error } = await supabase
          .from('transmedia_videos')
          .insert(videoPayload);

        if (error) throw error;
        showToast({ message: 'Video registrado con éxito.', type: 'success' });
      }

      setShowModal(false);
      loadVideos();
    } catch (err: any) {
      console.error('Error al guardar video transmedia:', err);
      showToast({ message: err.message || 'Error al guardar el video.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!videoToDelete) return;
    try {
      const { error } = await supabase
        .from('transmedia_videos')
        .delete()
        .eq('id', videoToDelete.id);

      if (error) throw error;
      showToast({ message: 'Video eliminado con éxito.', type: 'success' });
      setVideoToDelete(null);
      loadVideos();
    } catch (err: any) {
      console.error('Error al eliminar video transmedia:', err);
      showToast({ message: 'Error al eliminar el video.', type: 'error' });
    }
  };

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Video className="w-6 h-6 text-exec-blue" />
            </div>
            <span>Difusión <span className="text-exec-blue">Transmedia</span> y Videoteca</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Administra documentales, reportajes de campo y cápsulas transmedia para el Observatorio Territorial.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Video
        </button>
      </div>

      {/* ═══ ESTADO: CARGANDO ═══ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-exec-border border-t-exec-blue"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Cargando videoteca...</span>
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center p-12 bg-[#0A0A0A] border border-exec-border">
          <span className="material-symbols-outlined notranslate text-gray-700 text-5xl mb-3 block" translate="no">video_library</span>
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">No se encontraron documentales registrados</h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-600 mt-1 max-w-sm mx-auto">
            Registra el primer documental transmedia para alimentar el Observatorio Territorial del IICS.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 bg-exec-blue hover:bg-blue-500 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-none"
          >
            <Plus className="w-4 h-4" /> Registrar primer video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <div 
              key={video.id} 
              className="bg-black/40 border border-exec-border group hover:border-[#0099ff]/50 transition-all flex flex-col justify-between overflow-hidden shadow-lg"
            >
              {/* Thumbnail Container */}
              <div className="aspect-video w-full relative overflow-hidden bg-exec-black border-b border-exec-border">
                {video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video size={36} className="text-exec-slate/20" />
                  </div>
                )}
                
                {/* Duration Badge */}
                {video.duration && (
                  <span className="absolute bottom-2.5 right-2.5 bg-black/80 px-2 py-0.5 text-[9px] font-mono text-zinc-300">
                    {video.duration}
                  </span>
                )}

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                  <div className="w-12 h-12 rounded-full bg-[#0099ff] flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play size={20} className="ml-1 fill-white" />
                  </div>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4 flex-1 flex flex-col justify-between text-left space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {video.tags && video.tags.map(t => (
                      <span 
                        key={t} 
                        className="text-[8px] font-mono text-[#0099ff] bg-blue-950/20 border border-blue-900/20 px-1.5 py-0.5 uppercase"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase group-hover:text-[#0099ff] transition-colors leading-relaxed line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-[11px] text-exec-slate/85 line-clamp-3 leading-relaxed">
                    {video.desc}
                  </p>
                </div>

                <div className="border-t border-exec-border/50 pt-3 flex flex-col gap-1.5 text-[10px] text-exec-slate/70 font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <User size={12} className="text-[#0099ff]" />
                    <span className="truncate">Autores: {video.authors || 'No especificado'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#0099ff]" />
                      <span>Año: {video.year || 'No especificado'}</span>
                    </div>
                    {video.video_url && (
                      <a 
                        href={video.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-1 text-[#0099ff] hover:underline"
                      >
                        <ExternalLink size={10} /> Enlace
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-exec-border px-4 py-3 bg-[#0A0A0A] flex items-center justify-between gap-2.5">
                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{video.year || 'N/A'}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenEdit(video)}
                    className="flex items-center gap-1 text-gray-500 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    title="Editar video"
                  >
                    <Edit3 size={13} />
                    <span>Editar</span>
                  </button>
                  <div className="h-3 w-[1px] bg-exec-border"></div>
                  <button
                    onClick={() => setVideoToDelete(video)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-400 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    title="Eliminar video"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
       {/* ═══ MODAL CREAR / EDITAR ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-exec-border w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-exec-border">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <Video className="w-5 h-5 text-exec-blue" />
                {editingVideo ? 'Editar Video Transmedia' : 'Registrar Nuevo Video Transmedia'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Título del Video</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hualgayoc: El Latido del Agua"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border pl-3 pr-3 py-2 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Authors */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Autores / Creadores</label>
                  <input
                    type="text"
                    placeholder="Ej. Hery Díaz Bueno & Edwar Jahnpiere"
                    value={form.authors}
                    onChange={(e) => setForm(prev => ({ ...prev, authors: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border pl-3 pr-3 py-2 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Video URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Enlace del Video (YouTube)</label>
                  <input
                    type="url"
                    placeholder="Ej. https://www.youtube.com/watch?..."
                    value={form.video_url}
                    onChange={(e) => setForm(prev => ({ ...prev, video_url: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border pl-3 pr-3 py-2 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Duración</label>
                  <input
                    type="text"
                    placeholder="Ej. 18:45"
                    value={form.duration}
                    onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border pl-3 pr-3 py-2 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Año de Producción</label>
                  <input
                    type="text"
                    placeholder="Ej. 2026"
                    value={form.year}
                    onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border pl-3 pr-3 py-2 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Tag size={12} className="text-[#0099ff]" />
                    <span>Etiquetas (Separadas por comas)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Socioambiental, Recursos Hídricos, Etnografía"
                    value={form.tagsString}
                    onChange={(e) => setForm(prev => ({ ...prev, tagsString: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border pl-3 pr-3 py-2 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Descripción del Contenido</label>
                  <textarea
                    rows={3}
                    placeholder="Escribe un resumen analítico del documental..."
                    value={form.desc}
                    onChange={(e) => setForm(prev => ({ ...prev, desc: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-exec-border p-3 text-xs text-white rounded-none focus:border-zinc-700 focus:outline-none transition-all font-mono resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide block">Imagen de Portada (Miniatura)</label>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    {/* Preview box */}
                    <div className="w-full md:w-44 aspect-video bg-[#0d0d0f] border border-exec-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-exec-slate/20" size={32} />
                      )}
                    </div>

                    {/* File chooser */}
                    <div className="flex-1 w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-exec-border hover:border-[#0099ff]/50 transition-colors cursor-pointer bg-[#0d0d0f]/50">
                        <div className="flex flex-col items-center justify-center py-3 text-center">
                          <Upload size={20} className="text-exec-slate/60 mb-1" />
                          <p className="text-[10px] text-exec-slate font-bold uppercase tracking-wider">Subir Miniatura</p>
                          <p className="text-[8px] text-exec-slate/50 font-mono mt-0.5">PNG, JPG de alta resolución</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-exec-border/50">
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
                  className="flex items-center justify-center gap-2 bg-exec-blue hover:bg-blue-500 disabled:opacity-55 text-white text-[11px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-none transition-colors cursor-pointer shadow-lg shadow-exec-blue/20"
                >
                  {isSaving && <Loader2 size={12} className="animate-spin" />}
                  <span>{editingVideo ? 'Guardar Cambios' : 'Registrar Video'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {videoToDelete && (
        <ConfirmModal
          isOpen={!!videoToDelete}
          title="¿Confirmar Eliminación?"
          message={`¿Estás seguro de que deseas eliminar el video "${videoToDelete.title}"? Esta acción lo removerá de inmediato del Observatorio Territorial público.`}
          confirmText="Eliminar permanentemente"
          cancelText="Cancelar"
          onConfirm={handleDelete}
          onCancel={() => setVideoToDelete(null)}
        />
      )}
    </div>
  );
};
