import React, { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PdfThumbnailProps {
    bucketName: string;
    filePath: string;
    className?: string;
}

export const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ bucketName, filePath, className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

    useEffect(() => {
        let cancelled = false;
        let objectUrl = '';

        const render = async () => {
            try {
                // 1. Descargar el blob via Supabase SDK (maneja auth)
                const { data: blob, error: dlErr } = await supabase.storage
                    .from(bucketName)
                    .download(filePath);

                if (dlErr) throw new Error(`[PdfThumbnail] download: ${dlErr.message}`);
                if (!blob || cancelled) return;

                objectUrl = URL.createObjectURL(blob);

                // 2. Importar pdfjs-dist dinámicamente
                const pdfjsLib = await import('pdfjs-dist');

                // 3. Apuntar el worker al archivo LOCAL del paquete (evita versión mismatch con CDN)
                //    Vite resuelve import.meta.url y copia el .mjs al dist automáticamente
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                    'pdfjs-dist/build/pdf.worker.min.mjs',
                    import.meta.url
                ).href;

                if (cancelled) return;

                // 4. Cargar PDF desde blob URL
                const pdf = await pdfjsLib.getDocument({
                    url: objectUrl,
                    disableStream: false,
                    disableAutoFetch: false,
                }).promise;

                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                // 5. Escalar para llenar la tarjeta (~260px de ancho)
                const naturalViewport = page.getViewport({ scale: 1 });
                const scale = 260 / naturalViewport.width;
                const viewport = page.getViewport({ scale });

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx, viewport, canvas }).promise;

                if (!cancelled) setStatus('ok');
            } catch (err) {
                console.error('[PdfThumbnail] Error:', err);
                if (!cancelled) setStatus('error');
            }
        };

        render();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [bucketName, filePath]);

    if (status === 'error') {
        return (
            <div className={`flex items-center justify-center w-full h-full bg-[#0E0E0E] ${className}`}>
                <FileText className="w-10 h-10 text-red-400 opacity-60" />
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full bg-white overflow-hidden ${className}`}>
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111] z-10">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{
                    display: status === 'ok' ? 'block' : 'none',
                    objectFit: 'contain',
                }}
            />
        </div>
    );
};
