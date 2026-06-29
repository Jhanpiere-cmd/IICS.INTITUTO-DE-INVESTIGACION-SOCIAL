import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Edit2, Trash2, Copy, Eye, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';

interface Template {
    id: string;
    name: string;
    description: string;
    content: string;
    category: string;
    variables: string[];
    is_public: boolean;
}

interface TemplateGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (template: Template) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
    isOpen,
    onClose,
    onSelectTemplate
}) => {
    const { toast } = useToast();
    const { confirm } = useConfirm();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

    const categories = [
        { id: 'all', name: 'Todas', icon: FileText },
        { id: 'oficio', name: 'Oficios', icon: FileText },
        { id: 'memorandum', name: 'Memorándums', icon: FileText },
        { id: 'acta', name: 'Actas', icon: FileText },
        { id: 'circular', name: 'Circulares', icon: FileText },
        { id: 'general', name: 'General', icon: FileText },
    ];

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('document_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Error al cargar plantillas:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTemplates = selectedCategory === 'all'
        ? templates
        : templates.filter(t => t.category === selectedCategory);

    const handleSelectTemplate = (template: Template) => {
        onSelectTemplate(template);
        onClose();
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm(
            'ELIMINAR PLANTILLA',
            '¿Estás seguro de eliminar esta plantilla de documento oficial? Esta acción no se puede deshacer.',
            { isDestructive: true, confirmText: 'ELIMINAR', cancelText: 'CANCELAR' }
        );
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('document_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadTemplates();
        } catch (error) {
            console.error('Error al eliminar plantilla:', error);
        }
    };

    const handleDuplicateTemplate = async (template: Template, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            const { error } = await supabase
                .from('document_templates')
                .insert({
                    name: `${template.name} (Copia)`,
                    description: template.description,
                    content: template.content,
                    category: template.category,
                    variables: template.variables,
                    is_public: false,
                    created_by: user.id
                });

            if (error) throw error;
            await loadTemplates();
        } catch (error) {
            console.error('Error al duplicar plantilla:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[#050505] rounded-none border border-[#262626] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#262626] bg-[#0A0A0A]">
                    <div>
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Galería de Plantillas</h2>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Planificación de Documentación Oficial</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - Categories */}
                    <div className="w-48 border-r border-white/5 p-4 space-y-1">
                        {categories.map((category) => {
                            const Icon = category.icon;
                            const count = category.id === 'all'
                                ? templates.length
                                : templates.filter(t => t.category === category.id).length;

                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === category.id
                                            ? 'bg-exec-blue text-white shadow-[0_0_15px_rgba(0,136,255,0.3)]'
                                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span>{category.name}</span>
                                    </div>
                                    <span className="text-xs opacity-60">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Templates Grid */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-400">Cargando plantillas...</p>
                                </div>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <FileText className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
                                    <p className="text-gray-400 mb-2">No hay plantillas en esta categoría</p>
                                    <p className="text-sm text-gray-500">Crea tu primera plantilla desde un documento</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className="group bg-[#0A0A0A] border border-[#262626] rounded-none p-4 cursor-pointer hover:border-exec-blue/50 hover:shadow-2xl hover:shadow-exec-blue/5 transition-all duration-300"
                                    >
                                        {/* Preview */}
                                        <div className="relative bg-[#050505] border border-[#1A1A1A] rounded-none mb-4 h-36 overflow-hidden group-hover:border-exec-blue/30 transition-colors">
                                            <div
                                                className="p-3 text-[8px] text-gray-500 line-clamp-6 font-mono opacity-50 group-hover:opacity-100 transition-opacity"
                                                dangerouslySetInnerHTML={{ __html: template.content }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90"></div>
                                        </div>

                                        {/* Info */}
                                        <div className="mb-3">
                                            <h3 className="text-[11px] font-black text-white mb-1 group-hover:text-exec-blue transition-colors uppercase tracking-widest">
                                                {template.name}
                                            </h3>
                                            <p className="text-[9px] text-gray-600 font-medium line-clamp-2 uppercase tracking-tighter">
                                                {template.description || 'SIN DESCRIPCIÓN'}
                                            </p>
                                        </div>

                                        {/* Variables */}
                                        {template.variables && template.variables.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.variables.slice(0, 3).map((variable, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded border border-purple-500/30"
                                                    >
                                                        {`{{${variable}}}`}
                                                    </span>
                                                ))}
                                                {template.variables.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] rounded">
                                                        +{template.variables.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewTemplate(template);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-exec-blue hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all shadow-lg shadow-exec-blue/20"
                                                    title="Vista previa"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Visualizar
                                                </button>
                                                <button
                                                    onClick={(e) => handleDuplicateTemplate(template, e)}
                                                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-none border border-transparent hover:border-white/10 transition-all"
                                                    title="Duplicar"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            {!template.is_public && (
                                                    <button
                                                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                                                        className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 hover:text-red-400 rounded-none border border-transparent hover:border-red-500/20 transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                            )}
                                        </div>

                                        {/* Public Badge */}
                                        {template.is_public && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded border border-emerald-500/30">
                                                Pública
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setPreviewTemplate(null)}>
                    <div className="bg-white rounded-none w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-4 border-exec-blue" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-start justify-between mb-8 pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{previewTemplate.name}</h3>
                                    <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">{previewTemplate.description}</p>
                                </div>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div
                                className="prose prose-sm max-w-none text-gray-800 font-serif"
                                dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
                            />
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-300 rounded-none text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    handleSelectTemplate(previewTemplate);
                                    setPreviewTemplate(null);
                                }}
                                className="flex items-center gap-2 px-8 py-3 bg-exec-blue hover:bg-blue-600 text-white rounded-none text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20"
                            >
                                <Check className="w-4 h-4" />
                                Usar Plantilla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
