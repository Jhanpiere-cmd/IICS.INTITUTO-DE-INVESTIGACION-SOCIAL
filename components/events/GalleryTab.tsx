import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Video, Upload, Trash2, ArrowLeft, Loader2, ZoomIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';

interface GalleryTabProps {
    eventId: string;
}

interface GalleryItem {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    caption: string | null;
    uploaded_at: string;
}

export function GalleryTab({ eventId }: GalleryTabProps) {
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadGallery();
    }, [eventId]);

    async function loadGallery() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('event_gallery')
                .select('*')
                .eq('event_id', eventId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            setGalleryItems(data || []);
        } catch (error) {
            console.error('Error loading gallery:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map(async (f: any) => {
                const file = f as File;
                // Determinar tipo
                const fileType = file.type.startsWith('image/') ? 'image' : 'video';

                // Subir a Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${eventId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('event-gallery')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Obtener URL pública
                const { data: urlData } = supabase.storage
                    .from('event-gallery')
                    .getPublicUrl(fileName);

                // Insertar en base de datos
                const { error: dbError } = await supabase
                    .from('event_gallery')
                    .insert([{
                        event_id: eventId,
                        file_url: urlData.publicUrl,
                        file_type: fileType,
                        caption: null
                    }]);

                if (dbError) throw dbError;
            });

            await Promise.all(uploadPromises);
            showToast({
                type: 'success',
                title: 'PROTOCOLO_EXITOSO',
                message: `Se han integrado ${files.length} archivo(s) a la galería del sistema.`
            });
            loadGallery();
        } catch (error: any) {
            console.error('Error uploading files:', error);
            showToast({
                type: 'error',
                title: 'FALLO_DE_CARGA',
                message: `Error en la transferencia: ${error.message}`
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    async function handleDelete(item: GalleryItem) {
        const confirmed = await confirm(
            'ELIMINAR ARCHIVO',
            '¿Está seguro de que desea remover este elemento de la galería oficial? Esta acción no se puede deshacer.',
            { isDestructive: true, confirmText: 'ELIMINAR', cancelText: 'CANCELAR' }
        );

        if (!confirmed) return;

        try {
            // Extraer nombre del archivo de la URL
            const urlParts = item.file_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `${eventId}/${fileName}`;

            // Eliminar de Storage
            const { error: storageError } = await supabase.storage
                .from('event-gallery')
                .remove([filePath]);

            if (storageError) console.warn('Storage delete warning:', storageError);

            // Eliminar de base de datos
            const { error: dbError } = await supabase
                .from('event_gallery')
                .delete()
                .eq('id', item.id);

            if (dbError) throw dbError;

            showToast({
                type: 'success',
                title: 'SISTEMA_ACTUALIZADO',
                message: 'El archivo ha sido purgado de la base de datos y del almacenamiento.'
            });

            loadGallery();
        } catch (error) {
            console.error('Error deleting file:', error);
            showToast({
                type: 'error',
                title: 'ERROR_DE_PURGA',
                message: 'No se pudo completar la eliminación del archivo.'
            });
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-exec-blue" />
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] animate-pulse">Sincronizando Galería...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-2 space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-2">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => (window as any).setActiveEventSubTab?.(null)}
                        className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h3 className="text-[10px] font-black text-white tracking-[0.2em] uppercase leading-none">
                            Activos Multimedia
                        </h3>
                        <p className="text-[9px] text-gray-700 uppercase font-bold tracking-widest mt-1">
                            SGR-ACS / REGISTRO: {galleryItems.length} ARCHIVOS
                        </p>
                    </div>
                </div>

                <div className="w-full sm:w-auto">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto px-4 py-1.5 bg-exec-blue hover:bg-blue-500 text-black rounded-none flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-exec-blue/10 disabled:opacity-50 transition-all active:scale-95 border border-white/5"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                CARGANDO PROTOCOLO...
                            </>
                        ) : (
                            <>
                                <Upload className="w-3.5 h-3.5" />
                                INTEGRAR ARCHIVOS
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Gallery Grid */}
            {galleryItems.length === 0 ? (
                <div className="text-center py-12 bg-black border border-dashed border-[#1A1A1A] rounded-none">
                    <ImageIcon className="w-12 h-12 text-gray-900 mx-auto mb-3" />
                    <h3 className="text-[10px] font-black text-gray-700 mb-1 uppercase tracking-[0.3em]">
                        SIN ACTIVIDAD EN GALERÍA
                    </h3>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 pb-10 px-1">
                    {galleryItems.map(item => (
                        <div
                            key={item.id}
                            className="relative group bg-[#050505] rounded-none border border-[#111] overflow-hidden hover:border-exec-blue/50 transition-all shadow-2xl"
                        >
                            {/* File Preview */}
                            {item.file_type === 'image' ? (
                                <div className="aspect-square relative">
                                    <img
                                        src={item.file_url}
                                        alt={item.caption || 'Gallery image'}
                                        className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <button
                                        onClick={() => setLightboxImage(item.file_url)}
                                        className="absolute inset-0 bg-exec-blue/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"
                                    >
                                        <div className="w-12 h-12 rounded-none bg-black/60 border border-white/20 flex items-center justify-center text-white">
                                            <ZoomIn className="w-6 h-6 " />
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="aspect-square relative bg-black flex items-center justify-center">
                                    <video
                                        src={item.file_url}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                        controls
                                    />
                                    <div className="absolute top-3 left-3 px-3 py-1.5 bg-[#050505]/95 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-none backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-none bg-red-600 animate-pulse" />
                                        VIDEO_STREAM
                                    </div>
                                </div>
                            )}

                            {/* Delete Button - Always visible on mobile or hover on desktop */}
                            <button
                                onClick={() => handleDelete(item)}
                                className="absolute top-3 right-3 p-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-none md:opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md shadow-2xl border border-white/20 active:scale-90"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/98 backdrop-blur-xl p-4 animate-in fade-in duration-300"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-none text-white transition-all flex items-center justify-center border border-white/10 group active:scale-95"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Lightbox"
                        className="max-w-full max-h-[85vh] object-contain rounded-none shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
