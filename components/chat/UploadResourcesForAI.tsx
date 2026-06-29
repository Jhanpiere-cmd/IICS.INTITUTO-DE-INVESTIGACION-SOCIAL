import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export const UploadResourcesForAI: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setMessage(null);

    try {
      const uploadedFiles: string[] = [];

      for (const file of files) {
        // Sanitizar nombre de archivo: eliminar espacios y caracteres especiales
        const sanitizedName = file.name
          .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
          .replace(/[^a-zA-Z0-9._-]/g, '') // Eliminar caracteres especiales
          .toLowerCase(); // Convertir a minúsculas

        // Subir a la carpeta 'AI-Knowledge' en recursos
        const fileName = `AI-Knowledge/${Date.now()}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Registrar en la tabla de recursos
        const { error: dbError } = await supabase
          .from('resources')
          .insert({
            title: file.name,
            description: 'Documento para IA - Subido por Director',
            category: 'Conocimiento IA',
            folder: 'AI-Knowledge',
            file_urls: [fileName],
            uploaded_by: user?.id,
            visibility: 'interno'
          });

        if (dbError) throw dbError;
        uploadedFiles.push(file.name);
      }

      setMessage({
        type: 'success',
        text: `✅ ${uploadedFiles.length} archivo(s) subido(s) exitosamente. Gemini ahora puede acceder a este contenido.`
      });

      setFiles([]);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Error al subir archivos: ${error.message}`
      });
    } finally {
      setUploading(false);
    }
  };

  // Solo el Director puede ver esto
  if (user?.role !== 'Director' && user?.role !== 'Asesor') {
    return null;
  }

  return (
    <div className="bg-[#0A0A0A] text-gray-300">
      <div className="mb-6">
        <p className="text-sm text-gray-400">Sube archivos de texto que Gemini podrá leer para responder preguntas del equipo.</p>
      </div>

      {/* Información */}
      <div className="bg-[#111] rounded-xl p-5 mb-6 border border-exec-border">
        <p className="text-sm text-gray-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <strong>Formatos compatibles con HOYR AI:</strong>
        </p>
        <ul className="text-xs text-gray-500 space-y-2 ml-1">
          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> <strong>Texto:</strong> .txt, .md (Optimizado)</li>
          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> <strong>Datos:</strong> .json, .csv</li>
          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> <strong>Web:</strong> .html</li>
        </ul>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-[10px] text-yellow-500 font-semibold uppercase tracking-wider mb-1">
              ⚠️ PDFs: Conversión
            </p>
            <p className="text-xs text-yellow-200/70">
              Convierte PDFs a .txt para mejor precisión.
            </p>
          </div>
          <div className="p-3 bg-exec-blue/10 border border-exec-blue/20 rounded-lg">
            <p className="text-[10px] text-exec-blue font-semibold uppercase tracking-wider mb-1">
              💡 Tip Pro
            </p>
            <p className="text-xs text-blue-200/70">
              Usa nombres descriptivos para mejorar la búsqueda.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-4">
        <div className="border-2 border-dashed border-exec-border hover:border-exec-blue/50 rounded-xl p-8 text-center bg-[#111] transition-colors group">
          <input
            type="file"
            id="ai-file-upload"
            multiple
            accept=".txt,.md,.json,.csv,.html"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="ai-file-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-exec-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-exec-blue" />
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              Haz clic para seleccionar archivos
            </span>
            <span className="text-xs text-gray-500">
              o arrastra y suelta aquí
            </span>
          </label>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Archivos seleccionados:</p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-[#111] rounded-lg p-3 border border-exec-border hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors"
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="exec-btn-primary w-full justify-center py-3 text-sm"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Subiendo archivos...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Subir {files.length} archivo(s)</span>
            </>
          )}
        </button>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg p-4 flex items-start gap-3 border ${message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-gray-300">
              {message.text}
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 pt-6 border-t border-exec-border">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Documentos Recomendados
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div className="bg-[#111] p-2 rounded border border-gray-800">• Números de revista</div>
          <div className="bg-[#111] p-2 rounded border border-gray-800">• Lineamientos</div>
          <div className="bg-[#111] p-2 rounded border border-gray-800">• Planes de trabajo</div>
          <div className="bg-[#111] p-2 rounded border border-gray-800">• Actas de reuniones</div>
          <div className="bg-[#111] p-2 rounded border border-gray-800">• Guías y protocolos</div>
        </div>
      </div>
    </div>
  );
};
