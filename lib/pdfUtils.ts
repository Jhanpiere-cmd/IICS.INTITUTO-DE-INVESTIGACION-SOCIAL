// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { supabase } from './supabase';

/**
 * Extrae texto de un archivo PDF almacenado en Supabase
 * @param filePath Ruta del archivo en Supabase storage (ej: "folder/document.pdf")
 * @returns Texto extraído del PDF o null si falla
 */
export const extractPDFText = async (filePath: string): Promise<string | null> => {
    try {
        // Descargar el PDF desde Supabase Storage
        const { data, error } = await supabase.storage
            .from('resources')
            .download(filePath);

        if (error || !data) {
            console.error('Error downloading PDF:', error);
            return null;
        }

        // Convertir a Buffer para pdf-parse
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extraer texto
        const pdfData = await (pdfParse as any)(buffer);

        // Retornar texto (limitado a 5000 caracteres para no saturar el contexto)
        const text = pdfData.text.trim();
        return text.length > 5000 ? text.substring(0, 5000) + '...' : text;

    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return null;
    }
};

/**
 * Obtiene metadatos y contenido de recursos para el contexto de IA
 * @param limit Número máximo de recursos a incluir
 * @returns Array de recursos con metadatos y contenido (si es PDF o texto)
 */
export const getResourcesContext = async (limit: number = 20) => {
    try {
        // Obtener lista de recursos recientes
        const { data: resources, error } = await supabase
            .from('resources')
            .select('name, path, size, updated_at, contentType')
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (error || !resources) {
            console.error('Error fetching resources:', error);
            return [];
        }

        // Procesarrecursos
        const processedResources = await Promise.all(
            resources.map(async (resource) => {
                const baseInfo = {
                    name: resource.name,
                    type: resource.contentType || 'archivo',
                    size: resource.size ? `${(resource.size / 1024).toFixed(1)} KB` : 'N/A',
                    updated: new Date(resource.updated_at).toLocaleDateString('es-ES')
                };

                // Si es PDF, intentar extraer texto
                if (resource.contentType === 'application/pdf' || resource.name.toLowerCase().endsWith('.pdf')) {
                    const text = await extractPDFText(resource.path);
                    if (text) {
                        return {
                            ...baseInfo,
                            content: text,
                            hasContent: true
                        };
                    }
                }

                // Si es archivo de texto plano
                if (resource.contentType?.startsWith('text/') || resource.name.toLowerCase().match(/\.(txt|md|csv)$/)) {
                    try {
                        const { data } = await supabase.storage
                            .from('resources')
                            .download(resource.path);

                        if (data) {
                            const text = await data.text();
                            return {
                                ...baseInfo,
                                content: text.length > 2000 ? text.substring(0, 2000) + '...' : text,
                                hasContent: true
                            };
                        }
                    } catch (e) {
                        console.log('Could not extract text from', resource.name);
                    }
                }

                //  Para otros archivos, solo metadatos
                return baseInfo;
            })
        );

        return processedResources;

    } catch (error) {
        console.error('Error getting resources context:', error);
        return [];
    }
};
