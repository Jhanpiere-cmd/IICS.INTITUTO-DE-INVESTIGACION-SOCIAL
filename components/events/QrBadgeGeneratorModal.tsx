import React, { useEffect, useState } from 'react';
import { X, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface Event {
    id: string;
    title: string;
    description: string;
    event_type: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    location: string;
    is_online: boolean;
    cover_image_url?: string;
    registration_slug?: string;
}

interface QrBadgeGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event;
}

export function QrBadgeGeneratorModal({ isOpen, onClose, event }: QrBadgeGeneratorModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [generatingPng, setGeneratingPng] = useState(false);

    const registrationUrl = event.registration_slug
        ? `${window.location.origin}/registro/${event.registration_slug}`
        : `${window.location.origin}/inscribir/${event.id}`;

    useEffect(() => {
        if (isOpen && event.id) {
            QRCode.toDataURL(registrationUrl, { margin: 1, width: 450, color: { dark: '#000000', light: '#ffffff' } })
                .then(url => setQrDataUrl(url))
                .catch(err => console.error('Error al generar QR para insignia:', err));
        }
    }, [isOpen, event.id, registrationUrl]);

    if (!isOpen) return null;

    const loadHtmlImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    };

    const sanitizeFileName = (text: string): string => {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s_-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_');
    };

    // Draw high-resolution canvas QR image (512x512 px)
    const drawBadgeCanvas = async (): Promise<HTMLCanvasElement> => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // 1. Fondo blanco limpio (recuadro)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);

        // 2. Dibujar el código QR centrado ocupando la gran parte del espacio
        if (qrDataUrl) {
            const qrImage = await loadHtmlImage(qrDataUrl);
            const qrSize = 450;
            const qrX = (512 - qrSize) / 2; // = 31
            const qrY = (512 - qrSize) / 2; // = 31
            ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        }

        // 3. Borde fino gris exterior para delimitar la imagen cuadrada
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 510, 510);

        return canvas;
    };

    const downloadPNG = async () => {
        setGeneratingPng(true);
        try {
            const canvas = await drawBadgeCanvas();
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `Insignia_QR_${sanitizeFileName(event.title)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error al descargar PNG de insignia QR:', error);
            alert('No se pudo generar el PNG. Inténtalo de nuevo.');
        } finally {
            setGeneratingPng(false);
        }
    };

    const downloadPDF = async () => {
        setGeneratingPdf(true);
        try {
            const canvas = await drawBadgeCanvas();
            const imgData = canvas.toDataURL('image/png');

            // Crear un PDF cuadrado de 150x150 mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [150, 150]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 150, 150);
            pdf.save(`Insignia_QR_${sanitizeFileName(event.title)}.pdf`);
        } catch (error) {
            console.error('Error al descargar PDF de insignia QR:', error);
            alert('No se pudo generar el PDF. Inténtalo de nuevo.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0D0D0D] border border-exec-border w-full max-w-lg rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-exec-border bg-black">
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Generador de Tarjeta QR</h2>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Insignia diseñada para flyers externos y afiches.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white transition-colors rounded-none border border-transparent hover:border-white/10"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content / Live HTML Preview */}
                <div className="p-6 overflow-y-auto flex flex-col items-center gap-6 bg-[#0E0E0E]">
                    {/* HTML representation of the clean QR code with white padding and border */}
                    <div className="w-[280px] h-[280px] bg-white text-black p-5 border border-gray-300 flex items-center justify-center relative shadow-lg">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-[10px] text-gray-400 font-bold uppercase animate-pulse">Generando...</div>
                        )}
                    </div>

                    {/* Operational Details Card */}
                    <div className="w-full bg-black/40 border border-exec-border p-4 rounded-none space-y-2.5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Enlace de Destino</span>
                            <span className="text-[8px] text-exec-blue font-black uppercase tracking-wider bg-exec-blue/10 border border-exec-blue/20 px-2 py-0.5">
                                Formulario Público
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium break-all bg-black/50 p-2.5 border border-[#222] select-all font-mono leading-relaxed">
                            {registrationUrl}
                        </p>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-exec-border bg-black flex gap-3">
                    <button
                        onClick={downloadPNG}
                        disabled={generatingPng || !qrDataUrl}
                        className="flex-1 py-2.5 bg-exec-blue hover:bg-blue-400 text-black text-[10px] font-black uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                        {generatingPng ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Download size={12} />
                        )}
                        <span>DESCARGAR PNG</span>
                    </button>
                    <button
                        onClick={downloadPDF}
                        disabled={generatingPdf || !qrDataUrl}
                        className="flex-1 py-2.5 bg-[#111] hover:bg-[#151515] border border-[#222] hover:border-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                        {generatingPdf ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Download size={12} />
                        )}
                        <span>DESCARGAR PDF</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
