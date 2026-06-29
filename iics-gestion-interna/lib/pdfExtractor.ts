import { supabase } from './supabase';

/**
 * Utilidad para extraer texto de archivos PDF almacenados en Supabase Storage
 * IMPORTANTE: pdf-parse no funciona en el navegador, solo en Node.js
 * Esta es una versión "placeholder" que devuelve error hasta implementar solución backend
 */

export interface PDFExtractionResult {
    text: string;
    pageCount: number;
    fileSize: number;
    cached: boolean;
}

/**
 * Extrae texto de un buffer de PDF
 * NOTA: Esta función actualmente NO funciona en el navegador
 * TODO: Mover esta lógica a una Supabase Edge Function
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<{ text: string; numPages: number }> {
    // Por ahora, devolvemos un mensaje indicando que el PDF existe pero no se puede procesar
    console.warn('⚠️ PDF extraction is not yet implemented in browser. Use Edge Functions instead.');

    return {
        text: '[Contenido del PDF no disponible - Pendiente implementación de Edge Functions]',
        numPages: 1
    };
}

/**
 * Descarga un PDF desde Supabase Storage y extrae su contenido
 * Incluye sistema de caché en base de datos
 * TEMPORAL: Devuelve placeholder hasta implementar Edge Functions
 */
export async function downloadAndExtractPDF(storagePath: string): Promise<PDFExtractionResult> {
    try {
        // 1. Verificar si existe en caché
        const { data: cached, error: cacheError } = await supabase
            .from('pdf_content_cache')
            .select('extracted_text, page_count, file_size')
            .eq('file_path', storagePath)
            .eq('extraction_status', 'success')
            .single();

        if (cached && !cacheError) {
            console.log(`✅ PDF encontrado en caché: ${storagePath}`);
            return {
                text: cached.extracted_text || '',
                pageCount: cached.page_count || 0,
                fileSize: cached.file_size || 0,
                cached: true
            };
        }

        // 2. Descargar desde Storage para obtener metadata
        console.log(`📥 Verificando PDF: ${storagePath}`);
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('resources')
            .download(storagePath);

        if (downloadError || !fileData) {
            throw new Error(`Error descargando PDF: ${downloadError?.message || 'Archivo no encontrado'}`);
        }

        // 3. Obtener tamaño del archivo
        const arrayBuffer = await fileData.arrayBuffer();
        const fileSize = arrayBuffer.byteLength;

        // 4. TEMPORAL: No extraemos el texto por ahora
        console.warn(`⚠️ PDF detectado pero extracción no disponible: ${storagePath}`);
        const placeholderText = `[PDF: ${storagePath.split('/').pop()} - ${(fileSize / 1024).toFixed(2)} KB]\n\nPara leer el contenido de este PDF, por favor conviértelo a formato .txt y súbelo nuevamente.\n\nEl sistema de extracción automática de PDFs requiere una implementación backend (Edge Functions) y actualmente no está activo.`;

        // 5. Guardar en caché como "pending implementation"
        await supabase
            .from('pdf_content_cache')
            .upsert({
                file_path: storagePath,
                extracted_text: placeholderText,
                page_count: 1,
                file_size: fileSize,
                extraction_status: 'success',
                error_message: 'Browser extraction not implemented - use Edge Functions',
                extracted_at: new Date().toISOString()
            }, {
                onConflict: 'file_path'
            });

        return {
            text: placeholderText,
            pageCount: 1,
            fileSize,
            cached: false
        };

    } catch (error: any) {
        console.error('Error en downloadAndExtractPDF:', error);

        // Guardar el error en la caché
        await supabase
            .from('pdf_content_cache')
            .upsert({
                file_path: storagePath,
                extraction_status: 'failed',
                error_message: error.message,
                extracted_at: new Date().toISOString()
            }, {
                onConflict: 'file_path'
            });

        throw error;
    }
}

/**
 * Limpia la caché de un archivo específico (forzar re-extracción)
 */
export async function clearPDFCache(storagePath: string): Promise<void> {
    await supabase
        .from('pdf_content_cache')
        .delete()
        .eq('file_path', storagePath);

    console.log(`🗑️ Caché limpiada para: ${storagePath}`);
}

/**
 * Obtiene estadísticas de la caché de PDFs
 */
export async function getPDFCacheStats() {
    const { data, error } = await supabase
        .from('pdf_content_cache')
        .select('extraction_status, file_size');

    if (error || !data) {
        return { total: 0, success: 0, failed: 0, totalSize: 0 };
    }

    const stats = {
        total: data.length,
        success: data.filter(d => d.extraction_status === 'success').length,
        failed: data.filter(d => d.extraction_status === 'failed').length,
        totalSize: data.reduce((acc, curr) => acc + (curr.file_size || 0), 0)
    };

    return stats;
}
