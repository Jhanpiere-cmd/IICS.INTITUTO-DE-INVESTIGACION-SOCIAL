import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
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
    organizer_type?: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    certificate_type?: 'none' | 'free' | 'paid' | null;
    registration_slug?: string;
}

interface PromotionalFlyerModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event;
}

interface ImageAsset {
    base64: string;
    aspectRatio: number;
}

export function PromotionalFlyerModal({ isOpen, onClose, event }: PromotionalFlyerModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [generatingPng, setGeneratingPng] = useState(false);

    const registrationUrl = event.registration_slug
        ? `${window.location.origin}/registro/${event.registration_slug}`
        : `${window.location.origin}/inscribir/${event.id}`;

    // Generate QR Code data URL
    useEffect(() => {
        if (isOpen && event.id) {
            QRCode.toDataURL(registrationUrl, { margin: 1, width: 350, color: { dark: '#000000', light: '#ffffff' } })
                .then(url => setQrDataUrl(url))
                .catch(err => console.error('Error generating QR in flyer:', err));
        }
    }, [isOpen, event.id, registrationUrl]);

    if (!isOpen) return null;

    // Helper to load HTML Image Element
    const loadHtmlImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    // Helper to wrap text for Canvas
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

    // Helper to load image as base64 for jsPDF
    const loadImageAsset = async (url: string): Promise<ImageAsset> => {
        const img = await loadHtmlImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return {
            base64: canvas.toDataURL('image/png'),
            aspectRatio: img.naturalWidth / img.naturalHeight
        };
    };

    const sanitizeFileName = (text: string): string => {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s_-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_');
    };

    // Format operational details
    const formattedDate = event.scheduled_date
        ? new Date(event.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
        : 'Fecha por definir';

    const formattedTime = `${
        event.start_time
            ? new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            : ''
    }${
        event.end_time
            ? ` - ${new Date(`2000-01-01T${event.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            : ''
    }`;

    const locationText = event.is_online ? 'Despliegue Virtual' : (event.location || 'Por definir');

    // Dynamic Texts based on Event details
    const ctaText = (() => {
        const type = event.event_type?.toLowerCase();
        if (type === 'taller') return 'REGÍSTRATE EN EL TALLER PRÁCTICO';
        if (type === 'conversatorio') return 'REGÍSTRATE EN EL CONVERSATORIO';
        return 'REGÍSTRATE EN EL EVENTO ACADÉMICO';
    })();

    const certSub = (() => {
        const type = event.certificate_type;
        if (type === 'free') return 'Incluye Certificado de Participación Gratuito';
        if (type === 'paid') return 'Certificación de Participación Opcional (De Pago)';
        return 'Ingreso Libre (Sin entrega de certificado)';
    })();

    const downloadPDF = async () => {
        setGeneratingPdf(true);
        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const sx = (x_svg: number) => (x_svg * pageWidth) / 340;
            const sy = (y_svg: number) => (y_svg * pageHeight) / 480;

            const getQuadBezierPoints = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, steps: number = 30): [number, number][] => {
                const pts: [number, number][] = [];
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
                    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
                    pts.push([x, y]);
                }
                return pts;
            };

            const drawCurve = (points: [number, number][], strokeColor: [number, number, number], width: number) => {
                pdf.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                pdf.setLineWidth(width);
                for (let i = 0; i < points.length - 1; i++) {
                    pdf.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
                }
            };

            // Background (White)
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Draw a soft blue/light gray gradient at the bottom 70mm of the PDF (visible/notable)
            for (let y = pageHeight - 70; y < pageHeight; y += 1) {
                const t = (y - (pageHeight - 70)) / 70;
                // Fade from white (255, 255, 255) to #e3efff (227, 239, 255)
                const r = Math.floor(255 - (255 - 227) * t);
                const g = Math.floor(255 - (255 - 239) * t);
                const b = 255;
                pdf.setFillColor(r, g, b);
                pdf.rect(0, y, pageWidth, 1.1, 'F');
            }

            // Draw Glow 1 (Blue/Cyan radial gradient blur) in bottom-left/middle
            const glow1Cx = sx(60);
            const glow1Cy = sy(390);
            const glow1R = 90; // mm
            for (let r = glow1R; r > 0; r -= 1.5) {
                const t = r / glow1R;
                const red = Math.floor(200 + (255 - 200) * t);
                const green = Math.floor(215 + (255 - 215) * t);
                const blue = Math.floor(250 + (255 - 250) * t);
                pdf.setFillColor(red, green, blue);
                pdf.circle(glow1Cx, glow1Cy, r, 'F');
            }

            // Draw Glow 2 (Orange/Gold radial gradient blur) in top-right/middle
            const glow2Cx = sx(280);
            const glow2Cy = sy(150);
            const glow2R = 80; // mm
            for (let r = glow2R; r > 0; r -= 1.5) {
                const t = r / glow2R;
                const red = Math.floor(254 + (255 - 254) * t);
                const green = Math.floor(225 + (255 - 225) * t);
                const blue = Math.floor(175 + (255 - 175) * t);
                pdf.setFillColor(red, green, blue);
                pdf.circle(glow2Cx, glow2Cy, r, 'F');
            }

            // Draw Curves (more notable)
            const pts1a = getQuadBezierPoints(sx(-10), sy(150), sx(80), sy(180), sx(30), sy(300));
            const pts1b = getQuadBezierPoints(sx(30), sy(300), sx(-20), sy(420), sx(-20), sy(420));
            drawCurve([...pts1a, ...pts1b], [220, 225, 245], 0.7);

            const pts2a = getQuadBezierPoints(sx(-20), sy(160), sx(90), sy(190), sx(40), sy(310));
            const pts2b = getQuadBezierPoints(sx(40), sy(310), sx(-30), sy(430), sx(-30), sy(430));
            drawCurve([...pts2a, ...pts2b], [227, 231, 247], 0.5);

            const pts3a = getQuadBezierPoints(sx(-30), sy(170), sx(100), sy(200), sx(50), sy(320));
            const pts3b = getQuadBezierPoints(sx(50), sy(320), sx(-40), sy(440), sx(-40), sy(440));
            drawCurve([...pts3a, ...pts3b], [253, 238, 221], 0.5);

            const pts4a = getQuadBezierPoints(sx(350), sy(80), sx(260), sy(140), sx(280), sy(200));
            const pts4b = getQuadBezierPoints(sx(280), sy(200), sx(360), sy(320), sx(360), sy(320));
            drawCurve([...pts4a, ...pts4b], [222, 227, 246], 0.7);

            // Left side guide dots (more notable)
            pdf.setFillColor(173, 186, 232);
            const dotsY = [120, 140, 160, 180, 200, 220, 240, 260];
            dotsY.forEach(y => {
                pdf.circle(sx(10), sy(y), 0.6, 'F');
            });
            pdf.circle(sx(16), sy(240), 0.6, 'F');
            pdf.circle(sx(22), sy(240), 0.6, 'F');

            // Right side bold dots (more notable)
            pdf.setFillColor(140, 140, 140);
            const rightDotsY = [180, 195, 210, 225, 240, 255];
            rightDotsY.forEach(y => {
                pdf.circle(sx(328), sy(y), 0.8, 'F');
            });

            // Halftone Bottom Left (more notable, 25% opacity -> rgb(196, 206, 239))
            pdf.setFillColor(196, 206, 239);
            const cols = [15, 35, 55, 75, 95, 115, 135];
            const rows = [450, 435, 420, 405, 390];
            const getRadius = (colIdx: number, rowIdx: number) => {
                const val = 5 - (colIdx * 0.5 + rowIdx * 0.8);
                return val > 0.5 ? val : 0;
            };
            for (let c = 0; c < cols.length; c++) {
                for (let r = 0; r < rows.length; r++) {
                    const rad = getRadius(c, r);
                    if (rad > 0) {
                        pdf.circle(sx(cols[c]), sy(rows[r]), sx(rad), 'F');
                    }
                }
            }

            // Halftone Bottom Right (more notable, 18% opacity -> rgb(213, 220, 243))
            pdf.setFillColor(213, 220, 243);
            const colsR = [325, 310, 295, 280];
            const rowsR = [450, 435, 420, 405, 390];
            const getRadiusR = (colIdx: number, rowIdx: number) => {
                const val = 4 - (colIdx * 0.6 + rowIdx * 0.8);
                return val > 0.5 ? val : 0;
            };
            for (let c = 0; c < colsR.length; c++) {
                for (let r = 0; r < rowsR.length; r++) {
                    const rad = getRadiusR(c, r);
                    if (rad > 0) {
                        pdf.circle(sx(colsR[c]), sy(rowsR[r]), sx(rad), 'F');
                    }
                }
            }

            // Top decorative stripes
            pdf.setFillColor(21, 58, 191);
            pdf.rect(0, 0, pageWidth, 4, 'F');
            pdf.setFillColor(244, 152, 44);
            pdf.rect(0, 4, pageWidth, 1.5, 'F');

            // Bottom decorative stripes
            pdf.setFillColor(244, 152, 44);
            pdf.rect(0, pageHeight - 5.5, pageWidth, 1.5, 'F');
            pdf.setFillColor(21, 58, 191);
            pdf.rect(0, pageHeight - 4, pageWidth, 4, 'F');

            // Frames (UNC colors) - Custom interrupted/alternating design
            pdf.setDrawColor(21, 58, 191);
            pdf.setLineWidth(0.4);
            pdf.setLineDashPattern([6, 1.2, 1.5, 1.2], 0);
            pdf.rect(5, 8, pageWidth - 10, pageHeight - 16);

            pdf.setDrawColor(244, 152, 44);
            pdf.setLineWidth(0.25);
            pdf.setLineDashPattern([1.5, 1.2, 6, 1.2], 0);
            pdf.rect(6.5, 9.5, pageWidth - 13, pageHeight - 19);

            // Restore solid line pattern
            pdf.setLineDashPattern([], 0);

            // 1. Logos
            try {
                const logoUnc = await loadImageAsset('/certificates/logo-unc/R.png');
                const h = 20;
                pdf.addImage(logoUnc.base64, 'PNG', 12, 12, h * logoUnc.aspectRatio, h);
            } catch (e) {}
            try {
                const logoFacu = await loadImageAsset('/certificates/logo-facultad/logo-facultad.png');
                const h = 20;
                const w = h * logoFacu.aspectRatio;
                pdf.addImage(logoFacu.base64, 'PNG', pageWidth - 12 - w, 12, w, h);
            } catch (e) {}

            let logoRevistaAsset: ImageAsset | null = null;
            try {
                logoRevistaAsset = await loadImageAsset('/certificates/logo-revista/logo-revista-ACS.png');
            } catch (e) {}

            // Header Typography
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(21, 58, 191);
            pdf.setFontSize(11);
            pdf.text('UNIVERSIDAD NACIONAL DE CAJAMARCA', pageWidth / 2, 18, { align: 'center' });
            pdf.setTextColor(244, 152, 44);
            pdf.setFontSize(8.5);
            pdf.text('FACULTAD DE CIENCIAS SOCIALES', pageWidth / 2, 22.5, { align: 'center' });
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7.5);
            pdf.text('REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES', pageWidth / 2, 26, { align: 'center' });

            // Divider
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(12, 36, pageWidth - 12, 36);

            const hasCover = !!event.cover_image_url;

            if (hasCover) {
                let imgY = 42;
                let h = 135;
                let w = h;
                try {
                    const img = await loadImageAsset(event.cover_image_url);
                    w = h * img.aspectRatio;
                    if (w > 170) {
                        w = 170;
                        h = w / img.aspectRatio;
                    }
                    if (h > 140) {
                        h = 140;
                        w = h * img.aspectRatio;
                    }
                    const imgX = pageWidth / 2 - w / 2;
                    
                    // Subtle border for cover image
                    pdf.setDrawColor(226, 232, 240);
                    pdf.setLineWidth(0.4);
                    pdf.rect(imgX - 0.5, imgY - 0.5, w + 1, h + 1);

                    pdf.addImage(img.base64, 'JPEG', imgX, imgY, w, h);
                } catch (e) {
                    console.error('Error drawing cover image:', e);
                }

                // Draw QR Code centered in the bottom space
                if (qrDataUrl) {
                    const qrSize = 52;
                    const qrBlockHeight = qrSize + 12; // QR code + label
                    const remainingSpace = (pageHeight - 15) - (imgY + h);
                    const qrY = imgY + h + (remainingSpace - qrBlockHeight) / 2;
                    const qrX = pageWidth / 2 - qrSize / 2;

                    // Soft orange background card for QR
                    pdf.setFillColor(255, 252, 244);
                    pdf.setDrawColor(244, 152, 44);
                    pdf.setLineWidth(0.2);
                    pdf.rect(pageWidth / 2 - 35, qrY - 3, 70, qrSize + 11, 'FD');

                    // Blue border for QR
                    pdf.setDrawColor(21, 58, 191);
                    pdf.setLineWidth(0.5);
                    pdf.rect(qrX, qrY, qrSize, qrSize);

                    // Code Image
                    pdf.addImage(qrDataUrl, 'PNG', qrX + 2, qrY + 2, qrSize - 4, qrSize - 4);

                    // QR label
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(21, 58, 191);
                    pdf.setFontSize(9.5);
                    pdf.text('ESCANEA EL QR PARA INSCRIBIRTE', pageWidth / 2, qrY + qrSize + 6, { align: 'center' });

                    // Magazine Logo below QR card
                    if (logoRevistaAsset) {
                        const logoH = 8;
                        const logoW = logoH * logoRevistaAsset.aspectRatio;
                        pdf.addImage(logoRevistaAsset.base64, 'PNG', pageWidth / 2 - logoW / 2, qrY + qrSize + 11, logoW, logoH);
                    }
                }
            } else {
                // Draw title and details
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(15, 23, 42);
                pdf.setFontSize(15);
                const splitTitle = pdf.splitTextToSize(event.title.toUpperCase(), 180);
                pdf.text(splitTitle, pageWidth / 2, 48, { align: 'center' });

                const titleHeight = splitTitle.length * 6.5;
                const detailsTopY = 48 + titleHeight + 8;

                // Divider
                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.3);
                pdf.line(12, detailsTopY - 4, pageWidth - 12, detailsTopY - 4);

                // CTA
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(244, 152, 44);
                pdf.setFontSize(13);
                pdf.text(ctaText, pageWidth / 2, detailsTopY, { align: 'center' });

                // Certificate status
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(21, 58, 191);
                pdf.setFontSize(10.5);
                pdf.text(certSub, pageWidth / 2, detailsTopY + 7, { align: 'center' });

                // Logistics details
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(51, 65, 85);
                pdf.setFontSize(10);
                pdf.text(`FECHA: ${formattedDate.toUpperCase()}`, pageWidth / 2, detailsTopY + 18, { align: 'center' });
                pdf.text(`HORARIO: ${formattedTime.toUpperCase()}`, pageWidth / 2, detailsTopY + 25, { align: 'center' });
                
                const splitLocation = pdf.splitTextToSize(`LUGAR: ${locationText.toUpperCase()}`, 180);
                pdf.text(splitLocation, pageWidth / 2, detailsTopY + 32, { align: 'center' });

                const logisticsHeight = 32 + (splitLocation.length * 5);

                // QR Code at fixed position near bottom
                if (qrDataUrl) {
                    const qrSize = 52;
                    const qrX = pageWidth / 2 - qrSize / 2;
                    const qrY = pageHeight - 84;

                    // Soft orange background card for QR
                    pdf.setFillColor(255, 252, 244);
                    pdf.setDrawColor(244, 152, 44);
                    pdf.setLineWidth(0.2);
                    pdf.rect(pageWidth / 2 - 35, qrY - 3, 70, qrSize + 11, 'FD');

                    // Blue border for QR
                    pdf.setDrawColor(21, 58, 191);
                    pdf.setLineWidth(0.5);
                    pdf.rect(qrX, qrY, qrSize, qrSize);

                    // Code Image
                    pdf.addImage(qrDataUrl, 'PNG', qrX + 2, qrY + 2, qrSize - 4, qrSize - 4);

                    // QR label
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(21, 58, 191);
                    pdf.setFontSize(9.5);
                    pdf.text('ESCANEA EL QR PARA INSCRIBIRTE', pageWidth / 2, qrY + qrSize + 6, { align: 'center' });

                    // Magazine Logo below QR card
                    if (logoRevistaAsset) {
                        const logoH = 8;
                        const logoW = logoH * logoRevistaAsset.aspectRatio;
                        pdf.addImage(logoRevistaAsset.base64, 'PNG', pageWidth / 2 - logoW / 2, qrY + qrSize + 11, logoW, logoH);
                    }
                }
            }

            // Watermark footer
            pdf.setFont('courier', 'bold');
            pdf.setTextColor(148, 163, 184);
            pdf.setFontSize(7);
            pdf.text('SGR - DOCUMENTO OFICIAL DE INVITACIÓN', pageWidth / 2, pageHeight - 10, { align: 'center' });

            pdf.save(`Invitacion_QR_${sanitizeFileName(event.title)}.pdf`);
        } catch (error) {
            console.error('Error generating PDF flyer:', error);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const downloadPNG = async () => {
        setGeneratingPng(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1240;
            canvas.height = 1754;
            const ctx = canvas.getContext('2d')!;

            const sx_png = (x_svg: number) => (x_svg * 1240) / 340;
            const sy_png = (y_svg: number) => (y_svg * 1754) / 480;

            // Background with soft orange/cream gradient at the bottom (noticeable)
            const gradient = ctx.createLinearGradient(0, 0, 0, 1754);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.65, '#ffffff');
            gradient.addColorStop(1, '#e3efff'); // Notable blue fade at bottom
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1240, 1754);

            // Draw Glow 1 (Blue/Cyan radial gradient blur)
            const glow1 = ctx.createRadialGradient(
                sx_png(60), sy_png(390), 0,
                sx_png(60), sy_png(390), sx_png(90)
            );
            glow1.addColorStop(0, 'rgba(21, 58, 191, 0.18)');
            glow1.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glow1;
            ctx.fillRect(0, 0, 1240, 1754);

            // Draw Glow 2 (Orange/Gold radial gradient blur)
            const glow2 = ctx.createRadialGradient(
                sx_png(280), sy_png(150), 0,
                sx_png(280), sy_png(150), sx_png(80)
            );
            glow2.addColorStop(0, 'rgba(244, 152, 44, 0.18)');
            glow2.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glow2;
            ctx.fillRect(0, 0, 1240, 1754);

            // Draw Curved Lines (Swooshes) on background (more notable)
            // Curve 1 (blue, 15% opacity)
            ctx.strokeStyle = 'rgba(21, 58, 191, 0.15)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(sx_png(-10), sy_png(150));
            ctx.quadraticCurveTo(sx_png(80), sy_png(180), sx_png(30), sy_png(300));
            ctx.quadraticCurveTo(sx_png(-20), sy_png(420), sx_png(-20), sy_png(420));
            ctx.stroke();

            // Curve 2 (blue, 12% opacity)
            ctx.strokeStyle = 'rgba(21, 58, 191, 0.12)';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(sx_png(-20), sy_png(160));
            ctx.quadraticCurveTo(sx_png(90), sy_png(190), sx_png(40), sy_png(310));
            ctx.quadraticCurveTo(sx_png(-30), sy_png(430), sx_png(-30), sy_png(430));
            ctx.stroke();

            // Curve 3 (orange, 16% opacity)
            ctx.strokeStyle = 'rgba(244, 152, 44, 0.16)';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(sx_png(-30), sy_png(170));
            ctx.quadraticCurveTo(sx_png(100), sy_png(200), sx_png(50), sy_png(320));
            ctx.quadraticCurveTo(sx_png(-40), sy_png(440), sx_png(-40), sy_png(440));
            ctx.stroke();

            // Curve 4 (blue, 14% opacity)
            ctx.strokeStyle = 'rgba(21, 58, 191, 0.14)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(sx_png(350), sy_png(80));
            ctx.quadraticCurveTo(sx_png(260), sy_png(140), sx_png(280), sy_png(200));
            ctx.quadraticCurveTo(sx_png(360), sy_png(320), sx_png(360), sy_png(320));
            ctx.stroke();

            // Left side guide dots (more notable)
            ctx.fillStyle = 'rgba(21, 58, 191, 0.35)';
            const dotsY = [120, 140, 160, 180, 200, 220, 240, 260];
            dotsY.forEach(y => {
                ctx.beginPath();
                ctx.arc(sx_png(10), sy_png(y), 6, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.beginPath();
            ctx.arc(sx_png(16), sy_png(240), 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx_png(22), sy_png(240), 6, 0, Math.PI * 2);
            ctx.fill();

            // Right side bold dots (more notable)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            const rightDotsY = [180, 195, 210, 225, 240, 255];
            rightDotsY.forEach(y => {
                ctx.beginPath();
                ctx.arc(sx_png(328), sy_png(y), 8, 0, Math.PI * 2);
                ctx.fill();
            });

            // Halftone Bottom Left (more notable, 25% opacity)
            ctx.fillStyle = 'rgba(21, 58, 191, 0.25)';
            const cols = [15, 35, 55, 75, 95, 115, 135];
            const rows = [450, 435, 420, 405, 390];
            const getRadius = (colIdx: number, rowIdx: number) => {
                return 5 - (colIdx * 0.5 + rowIdx * 0.8);
            };
            for (let c = 0; c < cols.length; c++) {
                for (let r = 0; r < rows.length; r++) {
                    const rad = getRadius(c, r);
                    if (rad > 0.5) {
                        ctx.beginPath();
                        ctx.arc(sx_png(cols[c]), sy_png(rows[r]), rad * 3.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Halftone Bottom Right (more notable, 18% opacity)
            ctx.fillStyle = 'rgba(21, 58, 191, 0.18)';
            const colsR = [325, 310, 295, 280];
            const rowsR = [450, 435, 420, 405, 390];
            const getRadiusR = (colIdx: number, rowIdx: number) => {
                return 4 - (colIdx * 0.6 + rowIdx * 0.8);
            };
            for (let c = 0; c < colsR.length; c++) {
                for (let r = 0; r < rowsR.length; r++) {
                    const rad = getRadiusR(c, r);
                    if (rad > 0.5) {
                        ctx.beginPath();
                        ctx.arc(sx_png(colsR[c]), sy_png(rowsR[r]), rad * 3.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Top decorative stripes
            ctx.fillStyle = '#153ABF';
            ctx.fillRect(0, 0, 1240, 24);
            ctx.fillStyle = '#F4982C';
            ctx.fillRect(0, 24, 1240, 9);

            // Bottom decorative stripes
            ctx.fillStyle = '#F4982C';
            ctx.fillRect(0, 1754 - 33, 1240, 9);
            ctx.fillStyle = '#153ABF';
            ctx.fillRect(0, 1754 - 24, 1240, 24);

            // Borders - Custom interrupted/alternating design
            ctx.strokeStyle = '#153ABF';
            ctx.lineWidth = 4;
            ctx.setLineDash([80, 15, 20, 15]);
            ctx.strokeRect(30, 48, 1180, 1754 - 96);

            ctx.strokeStyle = '#F4982C';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([20, 15, 80, 15]);
            ctx.strokeRect(39, 57, 1162, 1754 - 114);

            // Restore solid line pattern
            ctx.setLineDash([]);

            // Logos
            try {
                const logoUnc = await loadHtmlImage('/certificates/logo-unc/R.png');
                const h = 120;
                const w = h * (logoUnc.naturalWidth / logoUnc.naturalHeight);
                ctx.drawImage(logoUnc, 70, 70, w, h);
            } catch (e) {}

            try {
                const logoFacu = await loadHtmlImage('/certificates/logo-facultad/logo-facultad.png');
                const h = 120;
                const w = h * (logoFacu.naturalWidth / logoFacu.naturalHeight);
                ctx.drawImage(logoFacu, 1240 - 70 - w, 70, w, h);
            } catch (e) {}

            let logoRevistaAsset: HTMLImageElement | null = null;
            try {
                logoRevistaAsset = await loadHtmlImage('/certificates/logo-revista/logo-revista-ACS.png');
            } catch (e) {}

            // Header Texts
            ctx.fillStyle = '#153ABF';
            ctx.font = 'bold 24px Montserrat, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('UNIVERSIDAD NACIONAL DE CAJAMARCA', 1240 / 2, 105);

            ctx.fillStyle = '#F4982C';
            ctx.font = 'bold 20px Montserrat, sans-serif';
            ctx.fillText('FACULTAD DE CIENCIAS SOCIALES', 1240 / 2, 135);

            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 16px Montserrat, sans-serif';
            ctx.fillText('REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES', 1240 / 2, 160);

            // Divider
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(70, 220);
            ctx.lineTo(1240 - 70, 220);
            ctx.stroke();

            const hasCover = !!event.cover_image_url;

            if (hasCover) {
                let imgY = 250;
                let h = 800;
                let w = h;
                try {
                    const cover = await loadHtmlImage(event.cover_image_url);
                    w = h * (cover.naturalWidth / cover.naturalHeight);
                    if (w > 1000) {
                        w = 1000;
                        h = w / (cover.naturalWidth / cover.naturalHeight);
                    }
                    if (h > 850) {
                        h = 850;
                        w = h * (cover.naturalWidth / cover.naturalHeight);
                    }
                    
                    // Subtle border for cover image
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(1240 / 2 - w / 2 - 2, imgY - 2, w + 4, h + 4);

                    ctx.drawImage(cover, 1240 / 2 - w / 2, imgY, w, h);
                } catch (e) {
                    console.error('Error drawing cover image:', e);
                }

                // Draw QR Code centered in the bottom space
                if (qrDataUrl) {
                    const qrSize = 320;
                    const qrBlockHeight = qrSize + 60;
                    const remainingSpace = 1684 - (imgY + h);
                    const qrY = imgY + h + (remainingSpace - qrBlockHeight) / 2;
                    const qrX = 1240 / 2 - qrSize / 2;

                    // Soft orange background card for QR (orange difuminado/destaque)
                    ctx.fillStyle = '#fffcf4';
                    ctx.strokeStyle = '#f4982c';
                    ctx.lineWidth = 2;
                    ctx.fillRect(1240 / 2 - 210, qrY - 15, 420, qrSize + 70);
                    ctx.strokeRect(1240 / 2 - 210, qrY - 15, 420, qrSize + 70);

                    // White box for QR code
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(qrX, qrY, qrSize, qrSize);

                    ctx.strokeStyle = '#153ABF';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(qrX, qrY, qrSize, qrSize);

                    const qrImage = await loadHtmlImage(qrDataUrl);
                    ctx.drawImage(qrImage, qrX + 12, qrY + 12, qrSize - 24, qrSize - 24);

                    ctx.fillStyle = '#153ABF';
                    ctx.font = 'bold 22px Montserrat, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('ESCANEA EL QR PARA INSCRIBIRTE', 1240 / 2, qrY + qrSize + 40);

                    // Magazine Logo below QR card
                    if (logoRevistaAsset) {
                        const logoH = 50;
                        const logoW = logoH * (logoRevistaAsset.naturalWidth / logoRevistaAsset.naturalHeight);
                        ctx.drawImage(logoRevistaAsset, 1240 / 2 - logoW / 2, qrY + qrSize + 65, logoW, logoH);
                    }
                }
            } else {
                // Draw title and details
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 44px Montserrat, sans-serif';
                ctx.textAlign = 'center';
                let currentY = 280;
                const titleLines = wrapText(ctx, event.title.toUpperCase(), 1100);
                titleLines.forEach(line => {
                    ctx.fillText(line, 1240 / 2, currentY);
                    currentY += 55;
                });

                currentY += 30;

                // Divider
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(70, currentY - 15);
                ctx.lineTo(1240 - 70, currentY - 15);
                ctx.stroke();

                // CTA Text
                ctx.fillStyle = '#F4982C';
                ctx.font = 'bold 32px Montserrat, sans-serif';
                ctx.fillText(ctaText, 1240 / 2, currentY + 15);

                // Certificate Info
                ctx.fillStyle = '#153ABF';
                ctx.font = 'bold 24px Montserrat, sans-serif';
                ctx.fillText(certSub, 1240 / 2, currentY + 60);

                // Details
                ctx.fillStyle = '#334155';
                ctx.font = '500 24px Montserrat, sans-serif';
                ctx.fillText(`FECHA: ${formattedDate.toUpperCase()}`, 1240 / 2, currentY + 125);
                ctx.fillText(`HORARIO: ${formattedTime.toUpperCase()}`, 1240 / 2, currentY + 170);
                
                const locationLines = wrapText(ctx, `LUGAR: ${locationText.toUpperCase()}`, 1000);
                let locY = currentY + 215;
                locationLines.forEach(line => {
                    ctx.fillText(line, 1240 / 2, locY);
                    locY += 40;
                });

                // QR Code at fixed position near bottom
                if (qrDataUrl) {
                    const qrSize = 320;
                    const qrX = 1240 / 2 - qrSize / 2;
                    const qrY = 1754 - 490;

                    // Soft orange background card for QR
                    ctx.fillStyle = '#fffcf4';
                    ctx.strokeStyle = '#f4982c';
                    ctx.lineWidth = 2;
                    ctx.fillRect(1240 / 2 - 210, qrY - 15, 420, qrSize + 70);
                    ctx.strokeRect(1240 / 2 - 210, qrY - 15, 420, qrSize + 70);

                    // White box for QR code
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(qrX, qrY, qrSize, qrSize);

                    ctx.strokeStyle = '#153ABF';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(qrX, qrY, qrSize, qrSize);

                    const qrImage = await loadHtmlImage(qrDataUrl);
                    ctx.drawImage(qrImage, qrX + 12, qrY + 12, qrSize - 24, qrSize - 24);

                    ctx.fillStyle = '#153ABF';
                    ctx.font = 'bold 22px Montserrat, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('ESCANEA EL QR PARA INSCRIBIRTE', 1240 / 2, qrY + qrSize + 40);

                    // Magazine Logo below QR card
                    if (logoRevistaAsset) {
                        const logoH = 50;
                        const logoW = logoH * (logoRevistaAsset.naturalWidth / logoRevistaAsset.naturalHeight);
                        ctx.drawImage(logoRevistaAsset, 1240 / 2 - logoW / 2, qrY + qrSize + 65, logoW, logoH);
                    }
                }
            }

            // Footer
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SGR - DOCUMENTO OFICIAL DE INVITACIÓN', 1240 / 2, 1754 - 50);

            // Trigger Download
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Invitacion_${sanitizeFileName(event.title)}.png`;
            link.click();
        } catch (error) {
            console.error('Error generating PNG flyer:', error);
        } finally {
            setGeneratingPng(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-[#050505] border border-[#1A1A1A] rounded-none shadow-2xl flex flex-col md:flex-row overflow-hidden my-8">
                {/* Visual Preview Panel */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#1A1A1A] bg-[#020202] overflow-y-auto max-h-[85vh]">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
                        Previsualización (A4 Vertical)
                    </div>

                    {/* Scaled A4 Preview Box */}
                    <div 
                        className="w-full max-w-[340px] aspect-[1/1.414] border border-gray-200 p-5 flex flex-col justify-between relative shadow-lg text-[6px] uppercase font-sans text-neutral-800 overflow-hidden"
                        style={{
                            background: 'linear-gradient(to bottom, #ffffff 65%, #e3efff 100%)'
                        }}
                    >
                        {/* SVGs de fondo decorativos */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <radialGradient id="blueGlow" cx="17.64%" cy="81.25%" r="26.47%">
                                    <stop offset="0%" stopColor="#153ABF" stopOpacity="0.18" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id="orangeGlow" cx="82.35%" cy="31.25%" r="23.53%">
                                    <stop offset="0%" stopColor="#F4982C" stopOpacity="0.18" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </radialGradient>
                            </defs>

                            {/* Glow Rectangles */}
                            <rect width="100%" height="100%" fill="url(#blueGlow)" />
                            <rect width="100%" height="100%" fill="url(#orangeGlow)" />

                            {/* Ondas curvas celestes a la izquierda (más notables) */}
                            <path d="M -10 150 Q 80 180 30 300 T -20 420" fill="none" stroke="#153ABF" strokeWidth="1.2" strokeOpacity="0.15" />
                            <path d="M -20 160 Q 90 190 40 310 T -30 430" fill="none" stroke="#153ABF" strokeWidth="0.8" strokeOpacity="0.12" />
                            <path d="M -30 170 Q 100 200 50 320 T -40 440" fill="none" stroke="#F4982C" strokeWidth="0.8" strokeOpacity="0.16" />

                            <path d="M 350 80 Q 260 140 280 200 T 360 320" fill="none" stroke="#153ABF" strokeWidth="1.2" strokeOpacity="0.14" />
                            
                            {/* Guías de puntos verticales a los lados (más notables) */}
                            <g fill="#153ABF" fillOpacity="0.35">
                                {/* Lado izquierdo */}
                                <circle cx="10" cy="120" r="1.5" />
                                <circle cx="10" cy="140" r="1.5" />
                                <circle cx="10" cy="160" r="1.5" />
                                <circle cx="10" cy="180" r="1.5" />
                                <circle cx="10" cy="200" r="1.5" />
                                <circle cx="10" cy="220" r="1.5" />
                                <circle cx="10" cy="240" r="1.5" />
                                <circle cx="10" cy="260" r="1.5" />
                                
                                {/* 3 puntos horizontales en el lateral izquierdo */}
                                <circle cx="16" cy="240" r="1.5" />
                                <circle cx="22" cy="240" r="1.5" />
                            </g>

                            {/* Grupo de 6 puntos verticales destacados en el lateral derecho (más notables) */}
                            <g fill="#000000" fillOpacity="0.45">
                                <circle cx="328" cy="180" r="2" />
                                <circle cx="328" cy="195" r="2" />
                                <circle cx="328" cy="210" r="2" />
                                <circle cx="328" cy="225" r="2" />
                                <circle cx="328" cy="240" r="2" />
                                <circle cx="328" cy="255" r="2" />
                            </g>

                            {/* Trama de puntos degradada (Halftone) - Esquina inferior izquierda (más notables) */}
                            <g fill="#153ABF" fillOpacity="0.25">
                                <circle cx="15" cy="450" r="5" />
                                <circle cx="35" cy="450" r="4.5" />
                                <circle cx="55" cy="450" r="4" />
                                <circle cx="75" cy="450" r="3.5" />
                                <circle cx="95" cy="450" r="3" />
                                <circle cx="115" cy="450" r="2.5" />
                                <circle cx="135" cy="450" r="2" />
                                
                                <circle cx="15" cy="435" r="4.5" />
                                <circle cx="35" cy="435" r="4" />
                                <circle cx="55" cy="435" r="3.5" />
                                <circle cx="75" cy="435" r="3" />
                                <circle cx="95" cy="435" r="2.5" />
                                <circle cx="115" cy="435" r="2" />
                                
                                <circle cx="15" cy="420" r="4" />
                                <circle cx="35" cy="420" r="3.5" />
                                <circle cx="55" cy="420" r="3" />
                                <circle cx="75" cy="420" r="2.5" />
                                <circle cx="95" cy="420" r="2" />
                                
                                <circle cx="15" cy="405" r="3" />
                                <circle cx="35" cy="405" r="2.5" />
                                <circle cx="55" cy="405" r="2" />
                                <circle cx="75" cy="405" r="1.5" />
                                
                                <circle cx="15" cy="390" r="2" />
                                <circle cx="35" cy="390" r="1.5" />
                                <circle cx="55" cy="390" r="1" />
                            </g>

                            {/* Trama de puntos degradada (Halftone) - Esquina inferior derecha (más notables) */}
                            <g fill="#153ABF" fillOpacity="0.18">
                                <circle cx="325" cy="450" r="4" />
                                <circle cx="325" cy="435" r="3.5" />
                                <circle cx="325" cy="420" r="3" />
                                <circle cx="325" cy="405" r="2.5" />
                                <circle cx="325" cy="390" r="2" />
                                
                                <circle cx="310" cy="450" r="3.5" />
                                <circle cx="310" cy="435" r="3" />
                                <circle cx="310" cy="420" r="2.5" />
                                <circle cx="310" cy="405" r="2" />
 
                                <circle cx="295" cy="450" r="3" />
                                <circle cx="295" cy="435" r="2.5" />
                                <circle cx="295" cy="420" r="2" />
                                
                                <circle cx="280" cy="450" r="2.5" />
                                <circle cx="280" cy="435" r="2" />
                            </g>
                        </svg>

                        {/* Top decorative stripes */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#153ABF] z-10" />
                        <div className="absolute top-1.5 left-0 right-0 h-[1px] bg-[#F4982C] z-10" />

                        {/* Bottom decorative stripes */}
                        <div className="absolute bottom-1.5 left-0 right-0 h-[1px] bg-[#F4982C] z-10" />
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#153ABF] z-10" />

                        {/* Custom decorative borders (interrupted/dashed design) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
                            <rect 
                                x="5" 
                                y="8" 
                                width="330" 
                                height="464" 
                                fill="none" 
                                stroke="#153ABF" 
                                strokeWidth="0.5" 
                                strokeDasharray="20 4 5 4" 
                                strokeOpacity="0.8" 
                            />
                            <rect 
                                x="6.5" 
                                y="9.5" 
                                width="327" 
                                height="461" 
                                fill="none" 
                                stroke="#F4982C" 
                                strokeWidth="0.3" 
                                strokeDasharray="5 4 20 4" 
                                strokeOpacity="0.6" 
                            />
                        </svg>

                        {/* Top Header */}
                        <div className="relative z-10 flex justify-between items-center pb-2 border-b border-gray-100 mt-[4px]">
                            <img src="/certificates/logo-unc/R.png" alt="UNC" className="h-6 object-contain" />
                            <div className="text-center font-bold tracking-tight">
                                <p className="text-exec-blue text-[6.5px] font-black">UNIVERSIDAD NACIONAL DE CAJAMARCA</p>
                                <p className="text-[#F4982C] text-[5px]">FACULTAD DE CIENCIAS SOCIALES</p>
                                <p className="text-gray-400 text-[4.5px] mt-0.5 font-medium">REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES</p>
                            </div>
                            <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" className="h-6 object-contain" />
                        </div>

                        {event.cover_image_url ? (
                            <>
                                {/* Case A: With cover image -> large framed cover image + QR code below */}
                                <div className="relative z-10 flex-1 flex items-center justify-center py-4">
                                    <img
                                        src={event.cover_image_url}
                                        alt="Cover"
                                        className="max-h-[220px] max-w-[275px] object-contain border border-gray-100 shadow-md"
                                        style={{ filter: 'drop-shadow(0 6px 12px rgba(21, 58, 191, 0.12))' }}
                                    />
                                </div>

                                <div className="relative z-10 flex flex-col items-center justify-center pb-2.5">
                                    <div className="flex flex-col items-center justify-center p-3.5 bg-[#fffcf4] border border-[#f4982c]/80 shadow-sm" style={{ borderRadius: '4px' }}>
                                        {qrDataUrl ? (
                                            <div className="w-[64px] h-[64px] bg-white p-1 border border-exec-blue flex items-center justify-center shadow-inner">
                                                <img src={qrDataUrl} alt="Inscripción QR" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-[64px] h-[64px] bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 font-bold text-[8px]">QR</div>
                                        )}
                                        <span className="text-[5.5px] text-exec-blue font-black tracking-widest mt-2 text-center">ESCANEA EL QR PARA INSCRIBIRTE</span>
                                    </div>
                                    <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Logo Revista ACS" className="h-4 object-contain mt-1.5 opacity-80" />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Case B: Without cover image -> show text details + QR */}
                                <div className="relative z-10 flex-1 flex flex-col justify-center items-center py-2 space-y-3">
                                    <h4 className="text-[9.5px] font-black text-neutral-900 text-center leading-tight tracking-wide px-2 uppercase font-serif">
                                        {event.title}
                                    </h4>

                                    <div className="text-center space-y-1">
                                        <p className="text-[#F4982C] font-black text-[9px] tracking-wider">{ctaText}</p>
                                        <p className="text-exec-blue font-bold text-[7.5px] tracking-wide leading-none">{certSub}</p>
                                    </div>

                                    <div className="text-neutral-600 font-bold space-y-0.5 text-[6.5px] leading-relaxed text-center">
                                        <p>Fecha: {formattedDate}</p>
                                        <p>Hora: {formattedTime}</p>
                                        <p>Lugar: {locationText}</p>
                                    </div>
                                </div>

                                <div className="relative z-10 flex flex-col items-center justify-center pb-2.5">
                                    <div className="flex flex-col items-center justify-center p-3 bg-[#fffcf4] border border-[#f4982c]/80 shadow-sm" style={{ borderRadius: '4px' }}>
                                        {qrDataUrl ? (
                                            <div className="w-[54px] h-[54px] bg-white p-1 border border-exec-blue flex items-center justify-center shadow-inner">
                                                <img src={qrDataUrl} alt="Inscripción QR" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-[54px] h-[54px] bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 font-bold text-[8px]">QR</div>
                                        )}
                                        <span className="text-[5.5px] text-exec-blue font-black tracking-widest mt-1.5 text-center">ESCANEA EL QR PARA INSCRIBIRTE</span>
                                    </div>
                                    <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Logo Revista ACS" className="h-4 object-contain mt-1.5 opacity-80" />
                                </div>
                            </>
                        )}

                        {/* Small footer watermark */}
                        <div className="relative z-10 text-center text-[4px] text-gray-400 font-mono tracking-tighter mb-[2px]">
                            SGR - DOCUMENTO OFICIAL DE INVITACIÓN
                        </div>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="w-full md:w-[320px] p-6 flex flex-col justify-between bg-[#080808]">
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Generador de Flyer</h3>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider mt-1">
                                    Invitación y difusión con QR
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-[#030303] border border-[#111] space-y-2">
                                <p className="text-[10px] font-black text-exec-blue uppercase tracking-widest">
                                    Información del Flyer
                                </p>
                                <ul className="space-y-1.5 text-[10px] font-bold text-gray-500">
                                    <li>• Tamaño: A4 vertical (210mm x 297mm)</li>
                                    <li>• Código QR: Enlace directo al formulario de registro</li>
                                    <li>• Tipo de evento: {event.event_type?.toUpperCase()}</li>
                                    <li>• Certificación: {event.certificate_type?.toUpperCase()}</li>
                                </ul>
                            </div>

                            <div className="text-[10px] text-gray-600 font-medium leading-relaxed">
                                Este poster digital se genera de manera automática con las especificaciones y logos oficiales.
                                Utiliza el archivo PDF para imprimir carteles de alta resolución, o el archivo PNG (imagen) para compartir en redes.
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-6 border-t border-[#111] mt-6">
                        <button
                            onClick={downloadPDF}
                            disabled={generatingPdf || generatingPng}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#111] hover:bg-[#151515] border border-[#222] text-white hover:border-exec-blue/40 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {generatingPdf ? (
                                <Loader2 size={12} className="animate-spin text-exec-blue" />
                            ) : (
                                <FileText size={12} className="text-exec-blue" />
                            )}
                            Descargar PDF (Imprimir)
                        </button>

                        <button
                            onClick={downloadPNG}
                            disabled={generatingPdf || generatingPng}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#153ABF] hover:bg-[#2263D9] text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {generatingPng ? (
                                <Loader2 size={12} className="animate-spin text-white" />
                            ) : (
                                <ImageIcon size={12} />
                            )}
                            Descargar Imagen (WhatsApp)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
