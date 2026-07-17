import React, { useState } from 'react';
import { FileText, Download, Loader2, Eye, CheckCircle2 } from 'lucide-react';

interface Message {
    role: string;
    content: string;
}

interface DocumentGeneratorProps {
    conversacion: Message[];
    onGenerado?: () => void;
}

type TipoDocumento = 'acta_reunion' | 'informe_ejecutivo' | 'articulo_academico';

export const DocumentGeneratorButton: React.FC<DocumentGeneratorProps> = ({
    conversacion,
    onGenerado
}) => {
    const [generando, setGenerando] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [tipoDetectado, setTipoDetectado] = useState<TipoDocumento | null>(null);
    const [preview, setPreview] = useState<any>(null);
    const [mostrandoPreview, setMostrandoPreview] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || '';

    // Detectar tipo de documento automáticamente
    const detectarTipo = async () => {
        try {
            const response = await fetch(`${API_URL}/api/detectar-tipo-documento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversacion })
            });

            const data = await response.json();
            setTipoDetectado(data.tipo);
            return data.tipo;
        } catch (error) {
            console.error('Error detectando tipo:', error);
            return 'informe_ejecutivo';
        }
    };

    // Obtener preview del documento
    const obtenerPreview = async () => {
        setMostrandoPreview(true);
        try {
            const response = await fetch(`${API_URL}/api/preview-documento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversacion,
                    tipo: tipoDetectado
                })
            });

            const data = await response.json();
            setPreview(data);
        } catch (error) {
            console.error('Error obteniendo preview:', error);
        } finally {
            setMostrandoPreview(false);
        }
    };

    // Generar documento Word
    const generarDocumento = async () => {
        setGenerando(true);

        try {
            const response = await fetch(`${API_URL}/api/generar-documento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversacion,
                    tipo: tipoDetectado
                })
            });

            if (!response.ok) {
                throw new Error('Error generando documento');
            }

            // Descargar archivo
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `Documento_${new Date().getTime()}.docx`;

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setMostrarModal(false);
            if (onGenerado) onGenerado();

        } catch (error) {
            console.error('Error:', error);
            alert('Hubo un error generando el documento');
        } finally {
            setGenerando(false);
        }
    };

    // Abrir modal y detectar tipo
    const abrirModal = async () => {
        setMostrarModal(true);
        await detectarTipo();
    };

    const tiposDocumentos = {
        acta_reunion: {
            nombre: 'Acta de Reunión',
            icon: FileText,
            descripcion: 'Documento formal con asistentes, acuerdos y tareas',
            color: 'blue'
        },
        informe_ejecutivo: {
            nombre: 'Informe Ejecutivo',
            icon: FileText,
            descripcion: 'Análisis profesional con conclusiones y recomendaciones',
            color: 'indigo'
        },
        articulo_academico: {
            nombre: 'Artículo Académico',
            icon: FileText,
            descripcion: 'Documento científico en formato APA 7',
            color: 'purple'
        }
    };

    return (
        <>
            {/* Botón principal */}
            <button
                onClick={abrirModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
            >
                <FileText className="w-5 h-5" />
                Generar Documento Word
            </button>

            {/* Modal de configuración */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                📄 Generador de Documentos Word
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                Crea documentos profesionales con logos institucionales
                            </p>
                        </div>

                        {/* Contenido */}
                        <div className="p-6 space-y-6">

                            {/* Tipo detectado */}
                            {tipoDetectado && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-green-900 dark:text-green-100">
                                                Tipo Detectado: {tiposDocumentos[tipoDetectado]?.nombre}
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                                {tiposDocumentos[tipoDetectado]?.descripcion}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Selector de tipo manual */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    Tipo de Documento
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {(Object.keys(tiposDocumentos) as TipoDocumento[]).map((tipo) => {
                                        const config = tiposDocumentos[tipo];
                                        return (
                                            <button
                                                key={tipo}
                                                onClick={() => setTipoDetectado(tipo)}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${tipoDetectado === tipo
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                                    }`}
                                            >
                                                <config.icon className={`w-6 h-6 mb-2 text-${config.color}-600`} />
                                                <p className="font-medium text-sm text-slate-900 dark:text-white">
                                                    {config.nombre}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Botón de preview */}
                            {tipoDetectado && !preview && (
                                <button
                                    onClick={obtenerPreview}
                                    disabled={mostrandoPreview}
                                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    {mostrandoPreview ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Analizando...</>
                                    ) : (
                                        <><Eye className="w-5 h-5" /> Ver Vista Previa</>
                                    )}
                                </button>
                            )}

                            {/* Preview de datos */}
                            {preview && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                                        Vista Previa de Contenido
                                    </h3>
                                    <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto max-h-48">
                                        {JSON.stringify(preview.datos_extraidos, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Footer - Acciones */}
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => setMostrarModal(false)}
                                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={generarDocumento}
                                disabled={!tipoDetectado || generando}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                            >
                                {generando ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Generando...</>
                                ) : (
                                    <><Download className="w-5 h-5" /> Generar Documento</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
