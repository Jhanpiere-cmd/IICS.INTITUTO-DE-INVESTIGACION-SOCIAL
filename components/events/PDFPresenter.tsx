import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuración del Worker usando la compatibilidad nativa de Vite/Vite-Plugin-Worker
// Esto empaqueta el worker localmente en lugar de depender de un CDN inestable.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFPresenterProps {
  url: string;
  pageNumber: number;
  className?: string;
  onLoadSuccess?: (numPages: number) => void;
}

export const PDFPresenter: React.FC<PDFPresenterProps> = ({ 
  url, 
  pageNumber, 
  className = "",
  onLoadSuccess 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        // TÉCNICA DE CARGA POR BLOB: 
        // Intentamos descargar el archivo como blob para saltar bloqueos de visualización parcial
        // y permitir que PDF.js trabaje con una URL local (blob://) que no tiene restricciones de CORS.
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const loadingTask = pdfjsLib.getDocument(blobUrl);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        if (onLoadSuccess) onLoadSuccess(pdf.numPages);
        
        // Liberamos la URL del blob después de cargar el documento en memoria
        URL.revokeObjectURL(blobUrl);

        renderPage(pageNumber);
      } catch (err: any) {
        console.error('SGR PDF ENGINE: Error loading PDF:', err);
        setError(`No se pudo cargar el PDF: ${err.message || 'Error de conexión / CORS'}`);
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, [url]);

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pageNumber);
    }
  }, [pageNumber]);

  const renderPage = async (num: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      setLoading(true);
      const page = await pdfDocRef.current.getPage(num);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Calculo de escala dinámico para ajuste perfecto
      const viewport = page.getViewport({ scale: 1.0 }); 
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const containerHeight = canvas.parentElement?.clientHeight || 600;
      
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY) * 1.5; // 1.5 para nitidez HD
      
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;
      setLoading(false);
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
        setLoading(false);
      }
    }
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-[#050505] overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">SGR Slide Engine Rendering...</p>
          </div>
        </div>
      )}
      
      {error ? (
        <div className="p-10 text-center flex flex-col items-center gap-4">
           <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-500/10 p-4 border border-red-500/20 rounded-sm">
             {error}
           </p>
           <div className="text-gray-500 text-[8px] font-medium max-w-xs leading-relaxed">
             TIP: Si el error persiste, asegúrate de que el bucket de Supabase tenga configurado **CORS** para permitir el dominio actual.
           </div>
           <button 
             onClick={() => window.location.reload()}
             className="px-4 py-2 bg-white/5 border border-white/10 text-white text-[8px] font-black uppercase hover:bg-white/10 transition-colors"
           >
             Reintentar Carga Forte
           </button>
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-full shadow-2xl animate-in fade-in zoom-in-95 duration-700"
          style={{ objectFit: 'contain' }}
        />
      )}
    </div>
  );
};
