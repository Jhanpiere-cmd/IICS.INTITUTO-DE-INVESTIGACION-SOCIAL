import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader2, Award, Check, AlertCircle, Mail, Send, ArrowLeft, MessageCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { whatsappService } from '../../lib/whatsapp';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CertificatesTabProps {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    organizerType?: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    flyerUrl?: string;
    eventType?: string;
    instructorName?: string;
    instructorRole?: string;
}

interface Participant {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    category: string;
    attended: boolean;
    certificate_generated: boolean;
    certificate_url?: string;
    last_email_sent_at?: string;
    payment_status: 'pending' | 'paid' | 'exempt';
    payment_receipt_url?: string;
}

function WhatsAppIcon({ size = 16, className = "" }: { size?: number, className?: string }) {
    return (
        <svg 
            viewBox="0 0 24 24" 
            width={size} 
            height={size} 
            fill="currentColor" 
            className={className}
        >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.488 1.459 5.407 1.461 5.432.003 9.85-4.416 9.854-9.852.002-2.63-1.018-5.105-2.87-6.961C17.18 1.947 14.7.925 12.01.925 6.575.925 2.16 5.34 2.157 10.774c-.002 1.922.504 3.799 1.467 5.418L2.65 21.052l4.997-1.898zm12.454-6.671c-.328-.164-1.94-.959-2.24-1.07-.3-.109-.52-.164-.74.164-.22.329-.85 1.07-1.04 1.29-.19.22-.38.24-.708.077-.328-.164-1.383-.51-2.634-1.627-.973-.867-1.63-1.94-1.821-2.268-.19-.328-.02-.507.144-.67.148-.147.328-.383.493-.575.164-.19.22-.328.328-.548.11-.22.055-.41-.027-.575-.082-.164-.74-1.78-.101-2.634-.261-.63-.526-.547-.74-.558l-.63-.011c-.22 0-.575.082-.876.411-.3.33-1.15 1.124-1.15 2.74 0 1.617 1.178 3.18 1.342 3.4.164.22 2.317 3.563 5.614 4.974.785.336 1.397.537 1.876.69.788.252 1.505.216 2.072.131.63-.094 1.94-.794 2.215-1.562.274-.767.274-1.424.192-1.562-.082-.138-.3-.22-.628-.384z"/>
        </svg>
    );
}

function formatWhatsAppPreview(text: string): string {
    if (!text) return '';
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Bold: *text* -> <strong>text</strong>
    formatted = formatted.replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '<strong>$1</strong>');
    
    // Italic: _text_ -> <em>text</em>
    formatted = formatted.replace(/_(?=\S)([^_]+?)(?<=\S)_/g, '<em>$1</em>');
    
    // Strikethrough: ~text~ -> <del>text</del>
    formatted = formatted.replace(/~(?=\S)([^~]+?)(?<=\S)~/g, '<del>$1</del>');

    // Monospace: ```text``` -> <code class="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">...</code>
    formatted = formatted.replace(/```(?=\S)([\s\S]+?)(?<=\S)```/g, '<code class="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">$1</code>');
    
    // Newlines to br
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
}

const CATEGORY_LABELS: Record<string, string> = {
    organizador: 'ORGANIZADOR',
    co_organizador: 'CO-ORGANIZADOR',
    ponente: 'PONENTE',
    comentarista: 'COMENTARISTA',
    artista_invitado: 'ARTISTA INVITADO',
    participante_general: 'PARTICIPANTE'
};

export function CertificatesTab({ 
    eventId, 
    eventTitle, 
    eventDate, 
    organizerType = 'acs', 
    flyerUrl,
    eventType = 'otro',
    instructorName,
    instructorRole
}: CertificatesTabProps) {
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generationCurrent, setGenerationCurrent] = useState(0);
    const [generationTotal, setGenerationTotal] = useState(0);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // WhatsApp States
    const [whatsAppParticipant, setWhatsAppParticipant] = useState<Participant | null>(null);
    const [whatsAppPhone, setWhatsAppPhone] = useState('');
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [emailCurrent, setEmailCurrent] = useState(0);
    const [emailTotal, setEmailTotal] = useState(0);
    const [emailElapsedSeconds, setEmailElapsedSeconds] = useState(0);

    function formatTime(seconds: number): string {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }

    useEffect(() => {
        let interval: any;
        if (generating) {
            setElapsedSeconds(0);
            const startTime = Date.now();
            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [generating]);

    useEffect(() => {
        let interval: any;
        if (sendingEmails) {
            setEmailElapsedSeconds(0);
            const startTime = Date.now();
            interval = setInterval(() => {
                setEmailElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setEmailElapsedSeconds(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [sendingEmails]);

    useEffect(() => {
        loadParticipants();
    }, [eventId]);

    async function loadParticipants() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('event_participants')
                .select('id, full_name, email, phone, category, attended, certificate_generated, certificate_url, last_email_sent_at, payment_status, payment_receipt_url')
                .eq('event_id', eventId)
                .eq('attended', true)
                .order('category, full_name');

            if (error) throw error;
            setParticipants(data || []);
        } catch (error) {
            console.error('Error loading participants:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleSelection(id: string) {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    }

    function selectAll() {
        setSelectedIds(new Set(participants.map(p => p.id)));
    }

    function clearSelection() {
        setSelectedIds(new Set());
    }

    // ─────────────────────────────────────────────────────────────
    //  Helper: convierte una URL de imagen a base64 para jsPDF
    // ─────────────────────────────────────────────────────────────
    interface ImageAsset {
        base64: string;
        aspectRatio: number;
    }

    async function loadImageAsset(url: string): Promise<ImageAsset> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                resolve({
                    base64: canvas.toDataURL('image/png'),
                    aspectRatio: img.naturalWidth / img.naturalHeight
                });
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    async function loadSvgAsImage(svgMarkup: string): Promise<ImageAsset> {
        const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        try {
            return await loadImageAsset(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function addDancingScriptFont(pdf: jsPDF): Promise<boolean> {
        try {
            const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf');
            if (!response.ok) throw new Error('Failed to fetch font');
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.byteLength; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = window.btoa(binary);
            pdf.addFileToVFS('DancingScript.ttf', base64);
            pdf.addFont('DancingScript.ttf', 'DancingScript', 'normal');
            return true;
        } catch (err) {
            console.error('Error loading custom font Dancing Script, falling back:', err);
            return false;
        }
    }

    async function generateCertificate(participant: Participant) {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const formattedDate = new Date(eventDate + 'T00:00:00').toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const categoryLabel = CATEGORY_LABELS[participant.category?.toLowerCase()] || participant.category?.toUpperCase() || 'PARTICIPANTE';
        const certCode = `EV-${eventId.substring(0, 4)}-${participant.id.substring(0, 6)}`.toUpperCase();

        // Generar QR de Verificación
        const verificationUrl = `${window.location.origin}/verificar/${participant.id}`;
        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 100 });
        } catch (e) {
            console.error('Error al generar QR:', e);
        }

        // Shared scaling helpers and vectors for premium layouts (Taller and Default ACS)
        const sx = (x: number) => (x * pageWidth) / 800;
        const sy = (y: number) => (y * pageHeight) / 530;

        function getCubicBezierPoints(
            x0: number, y0: number,
            x1: number, y1: number,
            x2: number, y2: number,
            x3: number, y3: number,
            steps: number = 30
        ): { x: number; y: number }[] {
            const points = [];
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const mt = 1 - t;
                const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
                const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
                points.push({ x, y });
            }
            return points;
        }

        function drawGoldDiamond(cx: number, cy: number, size: number) {
            pdf.setFillColor(244, 152, 44); // #F4982C
            const w = size;
            const h = size;
            pdf.polygon([
                { x: sx(cx), y: sy(cy - h) },
                { x: sx(cx + w), y: sy(cy) },
                { x: sx(cx), y: sy(cy + h) },
                { x: sx(cx - w), y: sy(cy) }
            ], 'F');
        }

        function drawLaurelBranch(cx: number, cy: number) {
            pdf.setDrawColor(197, 160, 89);
            pdf.setLineWidth(0.4);
            // Left stem
            pdf.line(sx(cx - 30), sy(cy), sx(cx), sy(cy));
            // Right stem
            pdf.line(sx(cx), sy(cy), sx(cx + 30), sy(cy));
            
            // Left leaves
            pdf.setFillColor(197, 160, 89);
            for (let dx of [5, 13, 21]) {
                pdf.polygon([
                    { x: sx(cx - dx), y: sy(cy) },
                    { x: sx(cx - dx - 4), y: sy(cy - 2) },
                    { x: sx(cx - dx - 8), y: sy(cy) },
                    { x: sx(cx - dx - 4), y: sy(cy + 1) }
                ], 'F');
            }
            // Right leaves
            for (let dx of [5, 13, 21]) {
                pdf.polygon([
                    { x: sx(cx + dx), y: sy(cy) },
                    { x: sx(cx + dx + 4), y: sy(cy - 2) },
                    { x: sx(cx + dx + 8), y: sy(cy) },
                    { x: sx(cx + dx + 4), y: sy(cy + 1) }
                ], 'F');
            }
        }

        // 🎨 DISEÑO ESPECIAL: TALLER PRÁCTICO (Si el tipo es taller)
        if (eventType?.toLowerCase() === 'taller') {

            // Fondo crema/blanco suave
            pdf.setFillColor(252, 251, 249);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Left Navy Panel
            const leftNavyPolygon = [
                { x: sx(0), y: sy(0) },
                ...getCubicBezierPoints(90, 0, 40, 150, 40, 380, 90, 530, 40).map(p => ({ x: sx(p.x), y: sy(p.y) })),
                { x: sx(0), y: sy(530) }
            ];
            pdf.setFillColor(10, 37, 64); // #0A2540
            pdf.polygon(leftNavyPolygon, 'F');

            // Right Navy Panel
            const rightNavyPolygon = [
                { x: sx(800), y: sy(0) },
                ...getCubicBezierPoints(710, 0, 760, 150, 760, 380, 710, 530, 40).map(p => ({ x: sx(p.x), y: sy(p.y) })),
                { x: sx(800), y: sy(530) }
            ];
            pdf.polygon(rightNavyPolygon, 'F');

            // Guilloche waves inside navy panels
            pdf.setDrawColor(197, 160, 89);
            pdf.setLineWidth(0.08); // Very thin
            // Left waves
            for (const X of [-20, 0, 20, 40, 60, 80]) {
                const pts = getCubicBezierPoints(X, 0, X - 50, 150, X - 50, 380, X, 530, 30);
                for (let i = 0; i < pts.length - 1; i++) {
                    pdf.line(sx(pts[i].x), sy(pts[i].y), sx(pts[i+1].x), sy(pts[i+1].y));
                }
            }
            // Right waves
            for (const X of [720, 740, 760, 780, 800, 820]) {
                const pts = getCubicBezierPoints(X, 0, X + 50, 150, X + 50, 380, X, 530, 30);
                for (let i = 0; i < pts.length - 1; i++) {
                    pdf.line(sx(pts[i].x), sy(pts[i].y), sx(pts[i+1].x), sy(pts[i+1].y));
                }
            }

            // Left ribbons
            const thickLeftPoints = getCubicBezierPoints(90, 0, 40, 150, 40, 380, 90, 530, 40);
            const thinLeftPoints = getCubicBezierPoints(97, 0, 47, 150, 47, 380, 97, 530, 40);
            
            pdf.setDrawColor(244, 152, 44); // #F4982C
            pdf.setLineWidth(sx(5));
            for (let i = 0; i < thickLeftPoints.length - 1; i++) {
                pdf.line(sx(thickLeftPoints[i].x), sy(thickLeftPoints[i].y), sx(thickLeftPoints[i+1].x), sy(thickLeftPoints[i+1].y));
            }
            pdf.setDrawColor(254, 200, 65); // #FEC841
            pdf.setLineWidth(sx(2));
            for (let i = 0; i < thinLeftPoints.length - 1; i++) {
                pdf.line(sx(thinLeftPoints[i].x), sy(thinLeftPoints[i].y), sx(thinLeftPoints[i+1].x), sy(thinLeftPoints[i+1].y));
            }

            // Right ribbons
            const thickRightPoints = getCubicBezierPoints(710, 0, 760, 150, 760, 380, 710, 530, 40);
            const thinRightPoints = getCubicBezierPoints(703, 0, 753, 150, 753, 380, 703, 530, 40);

            pdf.setDrawColor(244, 152, 44); // #F4982C
            pdf.setLineWidth(sx(5));
            for (let i = 0; i < thickRightPoints.length - 1; i++) {
                pdf.line(sx(thickRightPoints[i].x), sy(thickRightPoints[i].y), sx(thickRightPoints[i+1].x), sy(thickRightPoints[i+1].y));
            }
            pdf.setDrawColor(254, 200, 65); // #FEC841
            pdf.setLineWidth(sx(2));
            for (let i = 0; i < thinRightPoints.length - 1; i++) {
                pdf.line(sx(thinRightPoints[i].x), sy(thinRightPoints[i].y), sx(thinRightPoints[i+1].x), sy(thinRightPoints[i+1].y));
            }

            // Thin golden rectangle border frame
            pdf.setDrawColor(244, 152, 44);
            pdf.setLineWidth(sx(1.2));
            pdf.rect(sx(15), sy(15), sx(770), sy(500));

            // 9-dot grid in bottom-right corner
            pdf.setFillColor(254, 200, 65);
            for (let cx of [750, 762, 774]) {
                for (let cy of [460, 472, 484]) {
                    pdf.circle(sx(cx), sy(cy), sx(1.8), 'F');
                }
            }

            // Header logos (Symmetric - Left: UNC, Right: Facultad)
            // Left logo (UNC)
            try {
                const logoUnc = await loadImageAsset('/certificates/logo-unc/R.png');
                const h = 18; // mm (calibrated for smaller flat circular background)
                const w = h * logoUnc.aspectRatio;
                pdf.setFillColor(255, 255, 255);
                pdf.circle(sx(65), sy(65), sx(28), 'F');
                pdf.addImage(logoUnc.base64, 'PNG', sx(65) - w / 2, sy(65) - h / 2, w, h);
            } catch (e) { }

            // Right logo (Facultad)
            try {
                const logoFacu = await loadImageAsset('/certificates/logo-facultad/logo-facultad.png');
                const h = 18; // mm (calibrated for smaller flat circular background)
                const w = h * logoFacu.aspectRatio;
                pdf.setFillColor(255, 255, 255);
                pdf.circle(sx(735), sy(65), sx(28), 'F');
                pdf.addImage(logoFacu.base64, 'PNG', sx(735) - w / 2, sy(65) - h / 2, w, h);
            } catch (e) { }

            // Encabezado Oficial
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(10, 37, 64); // #0A2540
            pdf.setFontSize(16.5);
            pdf.text('INSTITUTO DE INVESTIGACION CIENTIFICA SOCIAL', pageWidth / 2, sy(48), { align: 'center' });
            pdf.setTextColor(197, 160, 89); // #C5A059
            pdf.setFontSize(11);
            pdf.text('IICS - OBSERVATORIO REGIONAL Y LABORATORIO DE DATOS', pageWidth / 2, sy(60), { align: 'center' });
            
            // Header diamond divider
            drawGoldDiamond(400, 78, 3.5);
            drawGoldDiamond(385, 78, 2);
            drawGoldDiamond(415, 78, 2);

            // CERTIFICADO
            pdf.setFont('times', 'bold');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(50);
            pdf.text('CERTIFICADO', pageWidth / 2, sy(135), { align: 'center' });
            
            // Category subtitle
            const subText = (() => {
                const cat = participant.category?.toLowerCase();
                if (cat === 'organizador') return 'DE ORGANIZADOR';
                if (cat === 'co_organizador') return 'DE CO-ORGANIZADOR';
                if (cat === 'ponente') return 'DE PONENTE';
                if (cat === 'comentarista') return 'DE COMENTARISTA';
                if (cat === 'artista_invitado') return 'DE ARTISTA INVITADO';
                return 'DE PARTICIPACIÓN';
            })();
            
            // Draw category ribbon banner
            pdf.setFillColor(197, 160, 89); // #C5A059
            pdf.polygon([
                { x: sx(280), y: sy(164) },
                { x: sx(520), y: sy(164) },
                { x: sx(510), y: sy(176) },
                { x: sx(520), y: sy(188) },
                { x: sx(280), y: sy(188) },
                { x: sx(290), y: sy(176) }
            ], 'F');

            pdf.setDrawColor(197, 160, 89);
            pdf.setLineWidth(sx(1.2));
            pdf.line(sx(200), sy(176), sx(270), sy(176));
            pdf.line(sx(530), sy(176), sx(600), sy(176));

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.text(subText, pageWidth / 2, sy(180), { align: 'center' });
            
            // Otorgado a
            pdf.setFont('times', 'italic');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(14.5);
            pdf.text('Otorgado a', pageWidth / 2, sy(208), { align: 'center' });

            // Nombre del Participante (cursive handwritten)
            const name = participant.full_name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            const hasCustomFont = await addDancingScriptFont(pdf);
            if (hasCustomFont) {
                pdf.setFont('DancingScript', 'normal');
                pdf.setFontSize(name.length > 25 ? 38 : 46);
            } else {
                pdf.setFont('times', 'bolditalic');
                pdf.setFontSize(name.length > 25 ? 24 : 28);
            }
            pdf.setTextColor(10, 37, 64);
            pdf.text(name, pageWidth / 2, sy(248), { align: 'center' });

            // Name diamond divider
            drawGoldDiamond(400, 272, 3.5);
            drawGoldDiamond(385, 272, 2);
            drawGoldDiamond(415, 272, 2);

            // Cuerpo del texto
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(12);
            pdf.text(`Por su participación y aprobación satisfactoria en calidad de ${categoryLabel} en el Taller Práctico:`, pageWidth / 2, sy(302), { align: 'center' });

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(13);
            const splitTallerTitle = pdf.splitTextToSize(`"${eventTitle.toUpperCase()}"`, pageWidth - sx(220));
            pdf.text(splitTallerTitle, pageWidth / 2, sy(318), { align: 'center' });

            // Docente
            if (instructorName) {
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9.5);
                pdf.text(`Bajo la dirección del docente:`, pageWidth / 2, sy(360), { align: 'center' });
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(10, 37, 64);
                pdf.setFontSize(11.5);
                pdf.text(instructorName, pageWidth / 2, sy(372), { align: 'center' });
            }

            // Fecha con divisor
            pdf.setDrawColor(197, 160, 89);
            pdf.setLineWidth(0.3);
            pdf.line(sx(250), sy(410), sx(385), sy(410));
            pdf.line(sx(415), sy(410), sx(550), sy(410));
            drawGoldDiamond(400, 410, 3);

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(197, 160, 89);
            pdf.setFontSize(10.5);
            pdf.text(`CAJAMARCA, ${formattedDate.toUpperCase()}`, pageWidth / 2, sy(424), { align: 'center' });

            // Laurel branch
            drawLaurelBranch(400, 505);

            // Decano signature & info
            try {
                const firmaDecano = await loadImageAsset('/certificates/firma-decano/firma-decano.png');
                const h = 28; // mm (restored to match proportions and line alignment)
                const w = h * firmaDecano.aspectRatio;
                pdf.addImage(firmaDecano.base64, 'PNG', sx(260) - w / 2, sy(456) - h + 13.0, w, h, undefined, 'FAST', 358);
            } catch (e) { }

            pdf.setDrawColor(10, 37, 64);
            pdf.setLineWidth(0.3);
            pdf.line(sx(200), sy(456), sx(320), sy(456));
            
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(9);
            pdf.text('DR. ELFER G. MIRANDA V.', sx(260), sy(466), { align: 'center' });
            
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7.5);
            pdf.text(['DECANO DE LA FACULTAD DE', 'CIENCIAS SOCIALES'], sx(260), sy(476), { align: 'center' });

            // ACS Logo center
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(18);
            pdf.text('ACS', sx(400), sy(462), { align: 'center' });
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(6.5);
            pdf.text('ACTIVIDADES EN CIENCIAS SOCIALES', sx(400), sy(472), { align: 'center' });

            // Directora signature & info
            try {
                const firmaDoris = await loadImageAsset('/certificates/firma-directora/firma-doctora-Doris.png');
                const h = 22; // mm
                const w = h * firmaDoris.aspectRatio;
                pdf.addImage(firmaDoris.base64, 'PNG', sx(540) - w / 2, sy(448) - h / 2, w, h, undefined, 'FAST', 357);
            } catch (e) { }

            pdf.line(sx(480), sy(456), sx(600), sy(456));
            
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(10, 37, 64);
            pdf.setFontSize(9);
            pdf.text('DRA. DORIS CASTAÃ‘EDA A.', sx(540), sy(466), { align: 'center' });
            
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7.5);
            pdf.text('DIRECTORA REVISTA ACS', sx(540), sy(476), { align: 'center' });

            // Gold seal medal
            try {
                const goldSealSvg = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30 70 L20 100 L35 90 L50 100 L40 70 Z" fill="#F4982C"/>
                    <path d="M70 70 L60 100 L50 90 L65 100 L80 100 L70 70 Z" fill="#F4982C"/>
                    <path d="M25 75 L15 95 L25 88 L35 95 L30 75 Z" fill="#FEC841"/>
                    <path d="M75 75 L65 95 L75 88 L85 95 L80 75 Z" fill="#FEC841"/>
                    <path d="M50 10L56.1226 18.3516L66.3816 15.5685L69.3496 25.6841L79.8242 26.0357L79.3551 36.3315L89.4315 39.3496L85.4952 48.8354L94.0205 54.5951L87.2144 62.3168L93.337 70.6685L84.2863 75.5186L87.2543 85.6343L77.1044 87.4912L76.6353 97.7871L66.1607 96.4172L62.2244 105.903L53.0745 101.565L44.9519 108.786L37.731 99.6357L28.2452 103.572L26.8753 93.0974L16.5795 93.5665L18.4364 83.4166L8.32074 80.4486L13.1708 71.3979L4.81912 65.2753L12.5408 58.4692L6.7811 49.9439L16.2669 46.0076L13.2488 35.9312L23.5446 35.4621L23.8962 24.9875L34.0118 27.9555L36.795 17.6965L45.1466 23.8191L50 10Z" fill="#FEC841"/>
                    <path d="M50 14L55.4338 21.4116L64.538 18.9419L67.1725 27.9197L76.4674 28.2318L76.051 37.3705L84.9937 40.0494L81.5002 48.4691L89.0664 53.5815L83.0232 60.4357L88.457 67.8473L80.4222 72.152L83.0567 81.1298L74.0483 82.7774L73.6319 91.916L64.337 90.6999L60.8435 99.1197L52.7237 95.2678L45.5147 101.677L39.105 93.5577L30.6853 97.0512L29.4692 87.7563L20.3305 88.1727L21.9781 79.1643L13.0003 76.5298L17.305 68.495L9.8934 63.0612L16.7476 57.018L11.6352 49.4518L20.0549 45.9583L17.376 37.0156L26.5147 36.5992L26.8268 27.3043L35.8046 29.9388L38.2743 20.8346L45.6859 26.2684L50 14Z" fill="#F4982C"/>
                    <circle cx="50" cy="55" r="28" fill="#fff" fill-opacity="0.15"/>
                    <circle cx="50" cy="55" r="24" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4"/>
                    <path d="M50 42L52.8214 49.4164L60.641 49.8492L54.5828 54.8394L56.4977 62.4L50 58.1836L43.5023 62.4L45.4172 54.8394L39.359 49.8492L47.1786 49.4164L50 42Z" fill="#fff"/>
                </svg>`;
                const sealImg = await loadSvgAsImage(goldSealSvg);
                pdf.addImage(sealImg.base64, 'PNG', sx(630), sy(430), sx(70), sy(70));
            } catch (e) { }

            // QR Code Container
            if (qrDataUrl) {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(sx(100), sy(530 - 26 - 82), sx(70), sy(82), 'F');
                pdf.setDrawColor(197, 160, 89);
                pdf.setLineWidth(sx(1.2));
                pdf.rect(sx(100), sy(530 - 26 - 82), sx(70), sy(82), 'D');

                pdf.addImage(qrDataUrl, 'PNG', sx(106), sy(530 - 26 - 82 + 6), sx(58), sy(58));
                
                pdf.setFont('courier', 'bold');
                pdf.setFontSize(6);
                pdf.setTextColor(197, 160, 89);
                pdf.text(certCode, sx(135), sy(530 - 26 - 82 + 76), { align: 'center' });
            }

        } else if (organizerType === 'colegio_sociologo_unidad') {
            // Fondo crema cálido
            pdf.setFillColor(252, 248, 242);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            // Banda superior rojo vino
            pdf.setFillColor(139, 0, 0);
            pdf.rect(0, 0, pageWidth, 42, 'F');
            // Banda inferior rojo vino delgada
            pdf.setFillColor(139, 0, 0);
            pdf.rect(0, pageHeight - 18, pageWidth, 18, 'F');
            // Marco exterior borde rojo vino
            pdf.setDrawColor(139, 0, 0);
            pdf.setLineWidth(2);
            pdf.rect(6, 6, pageWidth - 12, pageHeight - 12);

            try {
                const logoColegio = await loadImageAsset('/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png');
                const h = 62;
                pdf.addImage(logoColegio.base64, 'PNG', -10, -8, h * logoColegio.aspectRatio, h);
            } catch (e) { }

            try {
                const logoUnidad = await loadImageAsset('/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png');
                const h = 32;
                const w = h * logoUnidad.aspectRatio;
                pdf.addImage(logoUnidad.base64, 'PNG', pageWidth - 14 - w, 5, w, h);
            } catch (e) { }

            pdf.setFont('times', 'bold');
            pdf.setTextColor(255, 245, 220);
            pdf.setFontSize(12);
            pdf.text('Colegio de Sociólogos del Perú | Región Cajamarca', pageWidth / 2, 16, { align: 'center' });
            
            pdf.setTextColor(139, 0, 0);
            pdf.setFontSize(44);
            pdf.text('CERTIFICADO', pageWidth / 2, 67, { align: 'center' });
            
            pdf.setFontSize(14);
            pdf.setFont('times', 'italic');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Otorgado en calidad de: ${categoryLabel}`, pageWidth / 2, 75, { align: 'center' });

            pdf.setFontSize(13);
            pdf.setFont('times', 'normal');
            pdf.setTextColor(60, 60, 60);
            pdf.text(`Se otorga el presente a:`, pageWidth / 2, 92, { align: 'center' });

            pdf.setFontSize(30);
            pdf.setFont('times', 'bolditalic');
            pdf.setTextColor(0, 0, 0);
            pdf.text(participant.full_name.toUpperCase(), pageWidth / 2, 110, { align: 'center' });

            pdf.setFontSize(14);
            pdf.setFont('times', 'normal');
            pdf.setTextColor(60, 60, 60);
            pdf.text(`Por su participación en el evento:`, pageWidth / 2, 124, { align: 'center' });

            pdf.setFontSize(17);
            pdf.setFont('times', 'bold');
            pdf.setTextColor(139, 0, 0);
            const splitTitle = pdf.splitTextToSize(`"${eventTitle}"`, pageWidth - 70);
            pdf.text(splitTitle, pageWidth / 2, 136, { align: 'center' });

            pdf.setFontSize(11);
            pdf.setFont('times', 'italic');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Realizado el día ${formattedDate}`, pageWidth / 2, 154, { align: 'center' });

            // Logo Revista Abajo Proporcional
            try {
                const logoRevista = await loadImageAsset('/certificates/logo-revista/logo-revista-ACS.png');
                const h = 10;
                pdf.addImage(logoRevista.base64, 'PNG', pageWidth / 2 - (h * logoRevista.aspectRatio) / 2, 160, h * logoRevista.aspectRatio, h);
            } catch (e) { }

            // Firmas Reales Proporcionales
            try {
                const firmaDecano = await loadImageAsset('/certificates/firma-decano/firma-decano.png');
                const h = 20;
                pdf.addImage(firmaDecano.base64, 'PNG', 67.5 - (h * firmaDecano.aspectRatio) / 2, 162, h * firmaDecano.aspectRatio, h);
            } catch (e) { }
            try {
                const firmaDoris = await loadImageAsset('/certificates/firma-directora/firma-doctora-Doris.png');
                const h = 20;
                pdf.addImage(firmaDoris.base64, 'PNG', (pageWidth - 67.5) - (h * firmaDoris.aspectRatio) / 2, 162, h * firmaDoris.aspectRatio, h);
            } catch (e) { }

            pdf.setDrawColor(139, 0, 0); pdf.setLineWidth(0.3);
            pdf.line(40, 182, 95, 182);
            pdf.line(pageWidth - 95, 182, pageWidth - 40, 182);
            
            pdf.setFontSize(8.5);
            pdf.setFont('times', 'bold');
            pdf.setTextColor(15, 23, 42);
            pdf.text('Dr. Elfer G. Miranda V.', 67.5, 186, { align: 'center' });
            pdf.text('Dra. Doris Castañeda A.', pageWidth - 67.5, 186, { align: 'center' });
            pdf.setFontSize(7);
            pdf.setFont('times', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.text('DECANO FCS - UNC', 67.5, 189, { align: 'center' });
            pdf.text('DIRECTORA REVISTA ACS', pageWidth - 67.5, 189, { align: 'center' });

            if (qrDataUrl) {
                pdf.addImage(qrDataUrl, 'PNG', pageWidth - 22, pageHeight - 34, 14, 14);
            }

        } else if (organizerType === 'revista_la_colmena') {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Decoración lateral Azul Eléctrico
            pdf.setFillColor(0, 51, 102);
            pdf.rect(0, 0, 15, pageHeight, 'F');
            // Delgada línea amarilla
            pdf.setFillColor(255, 215, 0);
            pdf.rect(15, 0, 1.5, pageHeight, 'F');

            // Borde fino
            pdf.setDrawColor(0, 51, 102);
            pdf.setLineWidth(0.4);
            pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

            // Logos Cabecera Proporcionales
            try {
                const logoLaColmenaIcon = await loadImageAsset('/certificates/logo-la-colmena/logo-la-colmena-icono.png');
                const h = 14;
                pdf.addImage(logoLaColmenaIcon.base64, 'PNG', 24, 11, h * logoLaColmenaIcon.aspectRatio, h);
            } catch (e) { }
            try {
                const logoLaColmenaText = await loadImageAsset('/certificates/logo-la-colmena/logo-la-colmena-texto.png');
                const h = 8;
                pdf.addImage(logoLaColmenaText.base64, 'PNG', 39, 14, h * logoLaColmenaText.aspectRatio, h);
            } catch (e) { }

            // Separador
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(72, 12, 72, 25);

            try {
                const logoRevista = await loadImageAsset('/certificates/logo-revista/logo-revista-ACS.png');
                const h = 8;
                pdf.addImage(logoRevista.base64, 'PNG', 76, 13, h * logoRevista.aspectRatio, h);
            } catch (e) { }

            // Cabecera Texto (Derecha)
            pdf.setFont('times', 'bold');
            pdf.setTextColor(0, 51, 102);
            pdf.setFontSize(10);
            pdf.text('REVISTA "LA COLMENA" — PUCP', pageWidth - 15, 16, { align: 'right' });
            
            pdf.setFont('times', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(8);
            pdf.text('Alianza Estratégica con Revista ACS', pageWidth - 15, 21, { align: 'right' });

            // CERTIFICADO
            pdf.setFont('times', 'bold');
            pdf.setTextColor(0, 51, 102);
            pdf.setFontSize(38);
            pdf.text('CERTIFICADO', 24, 48);

            // Subtítulo de categoría
            const subText = (() => {
                const cat = participant.category?.toLowerCase();
                if (cat === 'organizador') return 'DE ORGANIZADOR';
                if (cat === 'co_organizador') return 'DE CO-ORGANIZADOR';
                if (cat === 'ponente') return 'DE PONENTE';
                if (cat === 'comentarista') return 'DE COMENTARISTA';
                if (cat === 'artista_invitado') return 'DE ARTISTA INVITADO';
                return 'DE PARTICIPACIÓN';
            })();
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(244, 152, 44); // Dorado
            pdf.setFontSize(10.5);
            pdf.text(subText, 102, 48);

            pdf.setFillColor(255, 215, 0);
            pdf.rect(24, 52, 28, 1.2, 'F');

            pdf.setFont('times', 'italic');
            pdf.setTextColor(71, 85, 105);
            pdf.setFontSize(11);
            pdf.text('Otorgado por participación destacada a:', 24, 61);

            // Nombre del Participante
            const name = participant.full_name.toUpperCase();
            pdf.setFont('times', 'bold');
            pdf.setTextColor(0, 51, 102);
            pdf.setFontSize(name.length > 25 ? 24 : 32);
            pdf.text(name, 24, 78);

            // Cuerpo del texto
            pdf.setFont('times', 'normal');
            pdf.setTextColor(51, 65, 85);
            pdf.setFontSize(11);
            const bodyText = `En reconocimiento a su asistencia y participación en el evento académico e institucional titulado: "${eventTitle}", realizado conjuntamente por las direcciones de ambas revistas.`;
            const splitBody = pdf.splitTextToSize(bodyText, pageWidth - 45);
            pdf.text(splitBody, 24, 98);

            // Fecha
            pdf.setFont('times', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(10);
            pdf.text(`Cajamarca / Lima, ${formattedDate}`, 24, 122);

            // Firmas Proporcionales
            try {
                const firmaDoris = await loadImageAsset('/certificates/firma-directora/firma-doctora-Doris.png');
                const h = 20;
                pdf.addImage(firmaDoris.base64, 'PNG', 57.5 - (h * firmaDoris.aspectRatio) / 2, 140, h * firmaDoris.aspectRatio, h);
            } catch (e) { }
            try {
                const firmaMicaela = await loadImageAsset('/certificates/logo-la-colmena/firma-micaela.png');
                const h = 20;
                pdf.addImage(firmaMicaela.base64, 'PNG', (pageWidth - 87.5) - (h * firmaMicaela.aspectRatio) / 2, 140, h * firmaMicaela.aspectRatio, h);
            } catch (e) { }

            pdf.setDrawColor(0, 51, 102); pdf.setLineWidth(0.3);
            pdf.line(30, 160, 85, 160);
            pdf.line(pageWidth - 115, 160, pageWidth - 60, 160);

            pdf.setFont('times', 'bold');
            pdf.setTextColor(0, 51, 102);
            pdf.setFontSize(10);
            pdf.text('Dra. Doris Castañeda Abanto', 57.5, 164, { align: 'center' });
            pdf.text('Micaela del R. Núñez Cordero', pageWidth - 87.5, 164, { align: 'center' });

            pdf.setFont('times', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(8);
            pdf.text('Directora - Revista ACS', 57.5, 167, { align: 'center' });
            pdf.text('Directora - Revista La Colmena', pageWidth - 87.5, 167, { align: 'center' });

            // QR
            if (qrDataUrl) {
                pdf.addImage(qrDataUrl, 'PNG', pageWidth - 35, 140, 18, 18);
                pdf.setDrawColor(0, 51, 102); pdf.setLineWidth(0.3);
                pdf.rect(pageWidth - 36, 139, 20, 20);
                pdf.setFont('times', 'normal');
                pdf.setTextColor(148, 163, 184);
                pdf.setFontSize(4.5);
                pdf.text('VERIFICACIÓN OFICIAL', pageWidth - 26, 162, { align: 'center' });
            }

        } else {
            // ════════════════════════════════════════════════════════
            // DISEÑO ACS (Por defecto)
            // ════════════════════════════════════════════════════════
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Borde doble fino rediseñado
            pdf.setDrawColor(21, 58, 191); // #153ABF
            pdf.setLineWidth(1.0);
            pdf.rect(6, 6, pageWidth - 12, pageHeight - 12);
            
            pdf.setDrawColor(244, 152, 44); // #F4982C
            pdf.setLineWidth(0.5);
            pdf.rect(8, 8, pageWidth - 16, pageHeight - 16);

            // Esquinas Geométricas (Triángulos)
            const cornerSize = 78;
            // Esquina Superior Derecha
            pdf.setFillColor(254, 200, 65); // #FEC841
            pdf.triangle(pageWidth, 0, pageWidth, 0.8 * cornerSize, pageWidth - 0.8 * cornerSize, 0, 'F');
            pdf.setFillColor(244, 152, 44); // #F4982C
            pdf.triangle(pageWidth, 0, pageWidth, 0.725 * cornerSize, pageWidth - 0.725 * cornerSize, 0, 'F');
            pdf.setFillColor(21, 58, 191); // #153ABF
            pdf.triangle(pageWidth, 0, pageWidth, 0.575 * cornerSize, pageWidth - 0.575 * cornerSize, 0, 'F');
            pdf.setFillColor(34, 99, 217); // #2263D9
            pdf.triangle(pageWidth, 0, pageWidth, 0.3 * cornerSize, pageWidth - 0.3 * cornerSize, 0, 'F');

            // Esquina Inferior Izquierda
            pdf.setFillColor(254, 200, 65); // #FEC841
            pdf.triangle(0, pageHeight, 0, pageHeight - 0.8 * cornerSize, 0.8 * cornerSize, pageHeight, 'F');
            pdf.setFillColor(244, 152, 44); // #F4982C
            pdf.triangle(0, pageHeight, 0, pageHeight - 0.725 * cornerSize, 0.725 * cornerSize, pageHeight, 'F');
            pdf.setFillColor(21, 58, 191); // #153ABF
            pdf.triangle(0, pageHeight, 0, pageHeight - 0.575 * cornerSize, 0.575 * cornerSize, pageHeight, 'F');
            pdf.setFillColor(34, 99, 217); // #2263D9
            pdf.triangle(0, pageHeight, 0, pageHeight - 0.3 * cornerSize, 0.3 * cornerSize, pageHeight, 'F');

            // Sello Dorado Inferior Derecho
            try {
                const goldSealSvg = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30 70 L20 100 L35 90 L50 100 L40 70 Z" fill="#F4982C"/>
                    <path d="M70 70 L60 100 L50 90 L65 100 L80 100 L70 70 Z" fill="#F4982C"/>
                    <path d="M25 75 L15 95 L25 88 L35 95 L30 75 Z" fill="#FEC841"/>
                    <path d="M75 75 L65 95 L75 88 L85 95 L80 75 Z" fill="#FEC841"/>
                    <path d="M50 10L56.1226 18.3516L66.3816 15.5685L69.3496 25.6841L79.8242 26.0357L79.3551 36.3315L89.4315 39.3496L85.4952 48.8354L94.0205 54.5951L87.2144 62.3168L93.337 70.6685L84.2863 75.5186L87.2543 85.6343L77.1044 87.4912L76.6353 97.7871L66.1607 96.4172L62.2244 105.903L53.0745 101.565L44.9519 108.786L37.731 99.6357L28.2452 103.572L26.8753 93.0974L16.5795 93.5665L18.4364 83.4166L8.32074 80.4486L13.1708 71.3979L4.81912 65.2753L12.5408 58.4692L6.7811 49.9439L16.2669 46.0076L13.2488 35.9312L23.5446 35.4621L23.8962 24.9875L34.0118 27.9555L36.795 17.6965L45.1466 23.8191L50 10Z" fill="#FEC841"/>
                    <path d="M50 14L55.4338 21.4116L64.538 18.9419L67.1725 27.9197L76.4674 28.2318L76.051 37.3705L84.9937 40.0494L81.5002 48.4691L89.0664 53.5815L83.0232 60.4357L88.457 67.8473L80.4222 72.152L83.0567 81.1298L74.0483 82.7774L73.6319 91.916L64.337 90.6999L60.8435 99.1197L52.7237 95.2678L45.5147 101.677L39.105 93.5577L30.6853 97.0512L29.4692 87.7563L20.3305 88.1727L21.9781 79.1643L13.0003 76.5298L17.305 68.495L9.8934 63.0612L16.7476 57.018L11.6352 49.4518L20.0549 45.9583L17.376 37.0156L26.5147 36.5992L26.8268 27.3043L35.8046 29.9388L38.2743 20.8346L45.6859 26.2684L50 14Z" fill="#F4982C"/>
                    <circle cx="50" cy="55" r="28" fill="#fff" fill-opacity="0.15"/>
                    <circle cx="50" cy="55" r="24" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4"/>
                    <path d="M50 42L52.8214 49.4164L60.641 49.8492L54.5828 54.8394L56.4977 62.4L50 58.1836L43.5023 62.4L45.4172 54.8394L39.359 49.8492L47.1786 49.4164L50 42Z" fill="#fff"/>
                </svg>`;
                const sealImg = await loadSvgAsImage(goldSealSvg);
                pdf.addImage(sealImg.base64, 'PNG', pageWidth - 15 - 28, pageHeight - 15 - 28, 28, 28);
            } catch (e) { }

            // Logos Cabecera Proporcionales (Izquierda: UNC, Derecha: Facultad)
            try {
                const logoUnc = await loadImageAsset('/certificates/logo-unc/R.png');
                const h = 25;
                pdf.addImage(logoUnc.base64, 'PNG', 11, 11, h * logoUnc.aspectRatio, h);
            } catch (e) { }
            try {
                const logoFacu = await loadImageAsset('/certificates/logo-facultad/logo-facultad.png');
                const h = 25;
                const w = h * logoFacu.aspectRatio;
                pdf.addImage(logoFacu.base64, 'PNG', pageWidth - 11 - w, 11, w, h);
            } catch (e) { }

            // Cabecera Texto
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(21, 58, 191); // #153ABF
            pdf.setFontSize(16.5);
            pdf.text('INSTITUTO DE INVESTIGACION CIENTIFICA SOCIAL', pageWidth / 2, 20, { align: 'center' });
            pdf.setTextColor(244, 152, 44); // #F4982C
            pdf.setFontSize(12);
            pdf.text('IICS - OBSERVATORIO REGIONAL Y LABORATORIO DE DATOS', pageWidth / 2, 25.5, { align: 'center' });

            // CERTIFICADO
            pdf.setFont('times', 'bold');
            pdf.setTextColor(21, 58, 191); // #153ABF
            pdf.setFontSize(52);
            pdf.text('CERTIFICADO', pageWidth / 2, 46, { align: 'center' });

            // Subtítulo con acentos decorativos dorados
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(244, 152, 44); // #F4982C
            pdf.setFontSize(13.5);
            const subText = (() => {
                const cat = participant.category?.toLowerCase();
                if (cat === 'organizador') return 'DE ORGANIZADOR';
                if (cat === 'co_organizador') return 'DE CO-ORGANIZADOR';
                if (cat === 'ponente') return 'DE PONENTE';
                if (cat === 'comentarista') return 'DE COMENTARISTA';
                if (cat === 'artista_invitado') return 'DE ARTISTA INVITADO';
                return 'DE PARTICIPACIÓN';
            })();
            pdf.text(subText, pageWidth / 2, 63, { align: 'center' });

            pdf.setDrawColor(244, 152, 44);
            pdf.setLineWidth(0.5);
            const textWidth = pdf.getTextWidth(subText);
            const lineStartOffset = textWidth / 2 + 2;
            const lineEndOffset = lineStartOffset + 6;
            pdf.line(pageWidth / 2 - lineEndOffset, 62.5, pageWidth / 2 - lineStartOffset, 62.5);
            pdf.line(pageWidth / 2 + lineStartOffset, 62.5, pageWidth / 2 + lineEndOffset, 62.5);

            // Otorgado a
            pdf.setFont('times', 'italic');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(14.5);
            pdf.text('Otorgado a', pageWidth / 2, 73, { align: 'center' });

            // Nombre (Title Case para formato manuscrito elegante)
            const name = participant.full_name
                .toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase());
            
            // Cargar fuente elegante Dancing Script
            const hasCustomFont = await addDancingScriptFont(pdf);
            if (hasCustomFont) {
                pdf.setFont('DancingScript', 'normal');
                pdf.setFontSize(name.length > 25 ? 38 : 50);
            } else {
                pdf.setFont('times', 'bolditalic');
                pdf.setFontSize(name.length > 25 ? 24 : 28);
            }
            pdf.setTextColor(21, 58, 191);
            pdf.text(name, pageWidth / 2, 86, { align: 'center' });

            pdf.setDrawColor(34, 99, 217); // #2263D9
            pdf.setLineWidth(0.6);
            pdf.line(pageWidth / 2 - 85, 92, pageWidth / 2 + 85, 92); // Wider line to match 60% HTML preview

            // Descripción Evento
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(21, 58, 191);
            pdf.setFontSize(13.5);
            pdf.text(`Por su destacada participación en calidad de ${categoryLabel} en el evento:`, pageWidth / 2, 108, { align: 'center' });

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(21, 58, 191);
            pdf.setFontSize(14.5);
            const splitTitle = pdf.splitTextToSize(`"${eventTitle}"`, pageWidth - 70);
            pdf.text(splitTitle, pageWidth / 2, 118, { align: 'center' });

            // Fecha (Dorado, Caps)
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(244, 152, 44);
            pdf.setFontSize(12);
            pdf.text(formattedDate.toUpperCase(), pageWidth / 2, 136, { align: 'center' });

            // Firmas Proporcionales y QR en el pie
            // QR Code (Centrado en el margen izquierdo de 38mm)
            if (qrDataUrl) {
                // Draw a solid white background block to cover the corner triangles
                pdf.setFillColor(255, 255, 255);
                pdf.rect(9.5, pageHeight - 35.5, 19, 23.5, 'F');

                pdf.addImage(qrDataUrl, 'PNG', 11, pageHeight - 34, 16, 16);
                pdf.setDrawColor(21, 58, 191);
                pdf.setLineWidth(0.4);
                pdf.rect(10.5, pageHeight - 34.5, 17, 17);

                // Draw certCode below QR code
                pdf.setFont('courier', 'bold');
                pdf.setFontSize(6);
                pdf.setTextColor(21, 58, 191);
                pdf.text(certCode, 19, pageHeight - 14.5, { align: 'center' });
            }

            // Firma 1 (Decano) - Centrada en 70.5mm, rotada -2 grados (358)
            try {
                const firmaDecano = await loadImageAsset('/certificates/firma-decano/firma-decano.png');
                const h = 28; // Increased from 20 to 28 mm to match preview proportions
                pdf.addImage(firmaDecano.base64, 'PNG', 70.5 - (h * firmaDecano.aspectRatio) / 2, pageHeight - 25 - h + 13.0, h * firmaDecano.aspectRatio, h, undefined, 'FAST', 358);
            } catch (e) { }

            pdf.setDrawColor(21, 58, 191);
            pdf.setLineWidth(0.3);
            pdf.line(43.5, pageHeight - 25, 97.5, pageHeight - 25); // Centered at 70.5mm, width 54mm

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(21, 58, 191);
            pdf.setFontSize(9.5);
            pdf.text('DR. ELFER G. MIRANDA V.', 70.5, pageHeight - 21, { align: 'center' });

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7.5);
            pdf.text(['DECANO DE LA FACULTAD DE', 'CIENCIAS SOCIALES'], 70.5, pageHeight - 17, { align: 'center' });

            // Logo Central ACS (Original PNG)
            try {
                const logoRevista = await loadImageAsset('/certificates/logo-revista/logo-revista-ACS.png');
                const h = 14; // 14 mm height
                const w = h * logoRevista.aspectRatio;
                pdf.addImage(logoRevista.base64, 'PNG', pageWidth / 2 - w / 2, pageHeight - 25, w, h);
            } catch (e) {
                console.error("Error drawing ACS logo in PDF:", e);
            }

            // Firma 2 (Directora) - Centrada en 226.5mm, rotada -3 grados (357)
            try {
                const firmaDoris = await loadImageAsset('/certificates/firma-directora/firma-doctora-Doris.png');
                const h = 28; // Increased from 20 to 28 mm to match preview proportions
                pdf.addImage(firmaDoris.base64, 'PNG', 226.5 - (h * firmaDoris.aspectRatio) / 2, pageHeight - 25 - h + 3, h * firmaDoris.aspectRatio, h, undefined, 'FAST', 357);
            } catch (e) { }

            pdf.setDrawColor(21, 58, 191);
            pdf.setLineWidth(0.3);
            pdf.line(199.5, pageHeight - 25, 253.5, pageHeight - 25); // Centered at 226.5mm, width 54mm

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(21, 58, 191);
            pdf.setFontSize(9.5);
            pdf.text('DRA. DORIS CASTAÑEDA A.', 226.5, pageHeight - 21, { align: 'center' });

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7.5);
            pdf.text('DIRECTORA REVISTA ACS', 226.5, pageHeight - 17, { align: 'center' });
        }

        return pdf;
    }

    function sanitizeFileName(text: string): string {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s_-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_');
    }

    async function handleGenerateCertificates() {
        if (selectedIds.size === 0) {
            showToast({ type: 'warning', title: 'SIN_SELECCIÓN', message: 'Debe seleccionar al menos un participante.' });
            return;
        }

        setGenerating(true);
        const selectedParticipants = participants.filter(p => selectedIds.has(p.id));
        setGenerationTotal(selectedParticipants.length);
        setGenerationCurrent(0);

        try {
            let current = 0;
            for (const participant of selectedParticipants) {
                const pdf = await generateCertificate(participant);
                const pdfBlob = pdf.output('blob');
                const fileName = `${eventId}/${participant.id}_${sanitizeFileName(participant.full_name)}.pdf`;
                const { error: uploadError } = await supabase.storage.from('event-certificates').upload(fileName, pdfBlob, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('event-certificates').getPublicUrl(fileName);
                await supabase.from('event_participants').update({ certificate_generated: true, certificate_url: publicUrl }).eq('id', participant.id);
                current++;
                setGenerationCurrent(current);
            }
            showToast({ type: 'success', title: 'PROCESO_FINALIZADO', message: 'Certificados generados y cargados.' });
            clearSelection();
            loadParticipants();
        } catch (error: any) {
            console.error('Error generating certificates:', error);
            showToast({ type: 'error', title: 'FALLO', message: error.message });
        } finally {
            setGenerating(false);
            setGenerationTotal(0);
            setGenerationCurrent(0);
        }
    }

    async function handleSendCertificates() {
        const selectedList = Array.from(selectedIds);
        if (selectedList.length === 0) return;
        
        setSendingEmails(true);
        setEmailTotal(selectedList.length);
        setEmailCurrent(0);
        
        try {
            let current = 0;
            const chunkSize = 5;
            for (let i = 0; i < selectedList.length; i += chunkSize) {
                const chunk = selectedList.slice(i, i + chunkSize);
                const payload = {
                    participantIds: chunk,
                    type: 'certificate',
                    eventTitle: eventTitle,
                    flyerUrl: flyerUrl
                };
                const { error } = await supabase.functions.invoke('send-participant-email-v2', { body: payload });
                if (error) throw error;
                current += chunk.length;
                setEmailCurrent(current);
            }
            showToast({ type: 'success', title: 'ÉXITO', message: 'Certificados enviados.' });
            clearSelection();
            loadParticipants();
        } catch (error: any) {
            showToast({ type: 'error', title: 'ERROR', message: error.message });
        } finally {
            setSendingEmails(false);
            setEmailTotal(0);
            setEmailCurrent(0);
        }
    }

    async function handleDownloadCertificate(participant: Participant) {
        try {
            const fileName = `${eventId}/${participant.id}_${sanitizeFileName(participant.full_name)}.pdf`;
            const { data, error } = await supabase.storage.from('event-certificates').download(fileName);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Certificado_${participant.full_name}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            showToast({ type: 'error', title: 'ERROR', message: 'No se pudo descargar.' });
        }
    }

    function cleanPhoneNumber(phoneNum: string): string {
        let cleaned = phoneNum.replace(/\D/g, '');
        if (cleaned.length === 9 && cleaned.startsWith('9')) {
            cleaned = '51' + cleaned;
        }
        return cleaned;
    }

    function handleOpenWhatsAppModal(p: Participant) {
        if (!p.certificate_generated || !p.certificate_url) {
            showToast({ type: 'warning', title: 'SIN CERTIFICADO', message: 'Debe generar el certificado de esta persona antes de enviarlo por WhatsApp.' });
            return;
        }
        setWhatsAppParticipant(p);
        setWhatsAppPhone(p.phone || '');
        
        const msg = `Hola *${p.full_name}*, te hacemos llegar tu certificado digital para el evento *"${eventTitle}"* por si no lo viste en tu correo.

Puedes visualizarlo y descargarlo ingresando a este enlace:
${p.certificate_url}

Atentamente,
*Revista Alternativas en Ciencias Sociales*
Equipo de Comunicación y Marketing.`;
        setWhatsAppMessage(msg);
    }

    async function handleSendWhatsAppAPI() {
        if (!whatsAppParticipant) return;
        if (!whatsAppPhone.trim()) {
            showToast({ type: 'error', title: 'NÚMERO REQUERIDO', message: 'Por favor ingresa un número de teléfono válido.' });
            return;
        }

        setSendingWhatsApp(true);
        try {
            const cleanPhone = cleanPhoneNumber(whatsAppPhone);
            
            let result;
            if (whatsAppParticipant.certificate_url) {
                const docName = `Certificado_${sanitizeFileName(whatsAppParticipant.full_name)}.pdf`;
                result = await whatsappService.sendDocumentMessage(cleanPhone, whatsAppParticipant.certificate_url, docName, whatsAppMessage);
            } else {
                result = await whatsappService.sendTextMessage(cleanPhone, whatsAppMessage);
            }
            
            if (result.error) throw new Error(result.error.message);

            // Persistir a Supabase whatsapp_messages
            try {
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('whatsapp_messages').insert({
                    to_phone: cleanPhone,
                    content: whatsAppMessage,
                    status: 'sent',
                    direction: 'outbound',
                    meta_message_id: result.messages?.[0]?.id,
                    created_by: user?.id
                });
            } catch (dbErr) {
                console.log('Error al guardar mensaje en historial:', dbErr);
            }

            showToast({ type: 'success', title: 'ENVIADO', message: 'Mensaje de WhatsApp enviado exitosamente por la API.' });
            setWhatsAppParticipant(null);
        } catch (err: any) {
            console.error('Error al enviar WhatsApp API:', err);
            showToast({ 
                type: 'error', 
                title: 'ERROR API', 
                message: `El envío automático falló: ${err.message || 'No hay ventana activa de 24h'}. Utiliza la opción de WhatsApp Web/App como alternativa.` 
            });
        } finally {
            setSendingWhatsApp(false);
        }
    }

    function handleSendWhatsAppWeb() {
        if (!whatsAppParticipant) return;
        if (!whatsAppPhone.trim()) {
            showToast({ type: 'error', title: 'NÚMERO REQUERIDO', message: 'Por favor ingresa un número de teléfono válido.' });
            return;
        }

        const cleanPhone = cleanPhoneNumber(whatsAppPhone);
        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsAppMessage)}`;
        window.open(url, '_blank');
        
        showToast({ type: 'success', title: 'REDIRECCIÓN', message: 'Se ha abierto el enlace para enviar el mensaje en WhatsApp.' });
        setWhatsAppParticipant(null);
    }

    const remainingCerts = generationTotal - generationCurrent;
    let estimatedRemainingText = 'Estimando...';
    if (generationCurrent > 0 && elapsedSeconds > 0) {
        const avgTimePerCert = elapsedSeconds / generationCurrent;
        const remainingSeconds = Math.round(avgTimePerCert * remainingCerts);
        estimatedRemainingText = formatTime(remainingSeconds);
    }

    const remainingEmails = emailTotal - emailCurrent;
    let estimatedRemainingEmailText = 'Estimando...';
    if (emailCurrent > 0 && emailElapsedSeconds > 0) {
        const avgTimePerEmail = emailElapsedSeconds / emailCurrent;
        const remainingSeconds = Math.round(avgTimePerEmail * remainingEmails);
        estimatedRemainingEmailText = formatTime(remainingSeconds);
    }

    const currentSendingName = (() => {
        if (emailTotal === 0 || emailCurrent >= emailTotal) return 'Finalizando envío...';
        const selectedList = Array.from(selectedIds);
        const currentId = selectedList[emailCurrent];
        const p = participants.find(part => part.id === currentId);
        return p ? `Enviando a: ${p.full_name}` : 'Enviando...';
    })();

    const groupedByCategory = participants.reduce<Record<string, Participant[]>>((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-exec-blue" />
            </div>
        );
    }

    if (participants.length === 0) {
        return (
            <div className="p-12 text-center bg-[#050505] border border-dashed border-[#262626]">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Sin participantes aptos</h3>
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-2 space-y-3">
            <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md p-2 border border-[#1A1A1A] flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-4 px-2">
                    <span className="text-[10px] font-black text-white uppercase">Gestión de Credenciales ({selectedIds.size})</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={selectAll} className="px-2 py-1.5 bg-[#0D0D0D] border border-[#262626] text-[9px] font-black uppercase">Todo</button>
                    <button onClick={clearSelection} className="px-2 py-1.5 bg-[#0D0D0D] border border-[#262626] text-[9px] font-black uppercase">Limpiar</button>
                    <button onClick={handleGenerateCertificates} disabled={generating || selectedIds.size === 0} className="px-3 py-1.5 bg-exec-blue text-black text-[9px] font-black uppercase">Generar</button>
                    <button onClick={handleSendCertificates} disabled={sendingEmails || selectedIds.size === 0} className="px-3 py-1.5 bg-[#111] text-exec-blue border border-exec-blue/20 text-[9px] font-black uppercase">Enviar</button>
                </div>
            </div>

            <div className="space-y-6 pb-20">
                {(Object.entries(groupedByCategory) as [string, Participant[]][]).map(([category, list]) => (
                    <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{category}</span>
                            <div className="h-px flex-1 bg-[#1A1A1A]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {list.map(p => (
                                <div key={p.id} onClick={() => toggleSelection(p.id)} className={`p-3 cursor-pointer border transition-all ${selectedIds.has(p.id) ? 'border-exec-blue bg-exec-blue/5' : 'border-[#1A1A1A] bg-[#050505]'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-white uppercase">{p.full_name}</p>
                                            <p className="text-[9px] text-gray-600 font-bold">{p.email}</p>
                                            {p.payment_status && (
                                                <div className="mt-1">
                                                    <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-none border ${
                                                        p.payment_status === 'paid' 
                                                            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/30' 
                                                            : p.payment_status === 'exempt'
                                                            ? 'bg-gray-950/20 text-gray-400 border-gray-800/30'
                                                            : 'bg-amber-950/20 text-amber-500 border-amber-800/30'
                                                    }`}>
                                                        {p.payment_status === 'paid' ? 'PAGADO' : p.payment_status === 'exempt' ? 'EXONERADO' : 'PENDIENTE'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {p.certificate_generated && (
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleDownloadCertificate(p)} className="p-1.5 bg-[#111] text-exec-blue border border-[#262626]" title="Descargar Certificado">
                                                        <Download size={12} />
                                                    </button>
                                                    <button onClick={() => handleOpenWhatsAppModal(p)} className="p-1.5 bg-[#111] text-emerald-500 border border-[#262626]" title="Enviar por WhatsApp">
                                                        <WhatsAppIcon size={12} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className={`w-4 h-4 border ${selectedIds.has(p.id) ? 'bg-exec-blue border-exec-blue' : 'border-[#333]'}`}>
                                                {selectedIds.has(p.id) && <Check size={10} className="text-black" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {generating && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-md p-6 bg-[#0A0A0A] border border-[#222] rounded-none shadow-2xl space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                                <Loader2 size={12} className="animate-spin text-exec-blue" />
                                Generando Credenciales
                            </span>
                            <span className="text-exec-blue animate-pulse">En proceso</span>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-black text-white">
                                <span className="truncate max-w-[280px] block">
                                    {generationTotal > 0 && generationCurrent < generationTotal 
                                        ? `Procesando: ${participants.filter(p => selectedIds.has(p.id))[generationCurrent]?.full_name || ''}`
                                        : 'Finalizando proceso...'
                                    }
                                </span>
                                <span className="text-exec-blue whitespace-nowrap">
                                    {generationCurrent}/{generationTotal}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                                Por favor, no cierre esta pestaña.
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider pt-2 border-t border-[#222] mt-2">
                                <span>Transcurrido: <span className="text-white font-mono">{formatTime(elapsedSeconds)}</span></span>
                                <span>Restante: <span className="text-exec-blue font-mono">{generationCurrent > 0 ? `~${estimatedRemainingText}` : 'Estimando...'}</span></span>
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="h-1.5 w-full bg-[#151515] overflow-hidden relative border border-[#222]">
                            <div 
                                className="h-full bg-exec-blue transition-all duration-500 ease-out"
                                style={{ width: `${generationTotal > 0 ? (generationCurrent / generationTotal) * 100 : 0}%` }}
                            />
                        </div>

                        {/* Percent indicator */}
                        <div className="text-right text-[10px] font-black text-gray-500 tracking-wider">
                            {generationTotal > 0 ? Math.round((generationCurrent / generationTotal) * 100) : 0}% COMPLETADO
                        </div>
                    </div>
                </div>
            )}

            {sendingEmails && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-md p-6 bg-[#0A0A0A] border border-[#222] rounded-none shadow-2xl space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                                <Loader2 size={12} className="animate-spin text-exec-blue" />
                                Enviando Certificados
                            </span>
                            <span className="text-exec-blue animate-pulse">En proceso</span>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-black text-white">
                                <span className="truncate max-w-[280px] block">
                                    {currentSendingName}
                                </span>
                                <span className="text-exec-blue whitespace-nowrap">
                                    {emailCurrent}/{emailTotal}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                                Por favor, no cierre esta pestaña mientras se envían los correos.
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider pt-2 border-t border-[#222] mt-2">
                                <span>Transcurrido: <span className="text-white font-mono">{formatTime(emailElapsedSeconds)}</span></span>
                                <span>Restante: <span className="text-exec-blue font-mono">{emailCurrent > 0 ? `~${estimatedRemainingEmailText}` : 'Estimando...'}</span></span>
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="h-1.5 w-full bg-[#151515] overflow-hidden relative border border-[#222]">
                            <div 
                                className="h-full bg-exec-blue transition-all duration-500 ease-out"
                                style={{ width: `${emailTotal > 0 ? (emailCurrent / emailTotal) * 100 : 0}%` }}
                            />
                        </div>

                        {/* Percent indicator */}
                        <div className="text-right text-[10px] font-black text-gray-500 tracking-wider">
                            {emailTotal > 0 ? Math.round((emailCurrent / emailTotal) * 100) : 0}% COMPLETADO
                        </div>
                    </div>
                </div>
            )}

            {whatsAppParticipant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#050505] border border-gray-200 dark:border-[#1F1F1F] w-full max-w-lg rounded-none overflow-hidden shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-[#1F1F1F] flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <WhatsAppIcon size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">ENVIAR CERTIFICADO</h4>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.2em] leading-none mt-1.5 italic">WHATSAPP PROTOCOL</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setWhatsAppParticipant(null)} 
                                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#1F1F1F]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Phone Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">NÚMERO DE TELÉFONO (WHATSAPP)</label>
                                <input 
                                    type="text" 
                                    value={whatsAppPhone} 
                                    onChange={e => setWhatsAppPhone(e.target.value)} 
                                    placeholder="Ej: 51987654321 o 987654321" 
                                    className="w-full bg-white dark:bg-[#0D0D0D] border border-gray-300 dark:border-[#1F1F1F] p-3 text-xs font-mono text-emerald-600 dark:text-emerald-500 rounded-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black">
                                    * Se formateará automáticamente con el código de país de Perú (51) si tiene 9 dígitos.
                                </p>
                            </div>

                            {/* Message Textarea */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">MENSAJE PERSONALIZADO</label>
                                <textarea 
                                    value={whatsAppMessage} 
                                    onChange={e => setWhatsAppMessage(e.target.value)} 
                                    rows={5}
                                    className="w-full bg-white dark:bg-[#0D0D0D] border border-gray-300 dark:border-[#1F1F1F] p-3 text-xs text-gray-900 dark:text-white rounded-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none font-medium leading-relaxed"
                                />
                            </div>

                            {/* Live Chat Bubble Preview */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">PREVISUALIZACIÓN VISUAL (FORMATO WHATSAPP)</label>
                                <div className="p-4 bg-[#efeae2] dark:bg-[#0b141a] border border-gray-200 dark:border-[#1F1F1F] flex flex-col gap-2 rounded-none min-h-[140px] max-h-[220px] overflow-y-auto custom-scrollbar relative">
                                    {/* Whatsapp Chat Bubble */}
                                    <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-lg p-3 text-xs shadow-sm max-w-[90%] relative self-start border border-emerald-100 dark:border-emerald-900/10">
                                        {/* Doc Badge (since we are sending it as a document PDF) */}
                                        {whatsAppParticipant.certificate_url && (
                                            <div className="mb-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/20 rounded flex items-center gap-2.5">
                                                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-black text-[10px]">
                                                    PDF
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">
                                                        Certificado_{sanitizeFileName(whatsAppParticipant.full_name)}.pdf
                                                    </p>
                                                    <p className="text-[8px] text-gray-500 dark:text-gray-400 uppercase font-black">
                                                        Documento Adjunto
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div 
                                            className="whitespace-pre-wrap leading-relaxed select-text"
                                            dangerouslySetInnerHTML={{ __html: formatWhatsAppPreview(whatsAppMessage) }}
                                        />
                                        
                                        <div className="text-right text-[8px] text-gray-500 dark:text-gray-400/80 mt-1.5 flex items-center justify-end gap-1 font-bold">
                                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {/* WhatsApp double checkmark */}
                                            <svg viewBox="0 0 16 11" width="12" height="8" fill="none" stroke="currentColor" className="text-[#53bdeb] inline-block">
                                                <path d="M1 5l3 3 7-7M5 8l1.5 1.5 5.5-5.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/20 text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed rounded-none">
                                <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-wider text-[10px]">Información de envío:</p>
                                La opción <strong className="text-gray-900 dark:text-white">API Directa</strong> requiere que las credenciales de Meta estén activas y que el número destino esté habilitado (dentro de la ventana de 24h de WhatsApp). La opción <strong className="text-gray-900 dark:text-white">WhatsApp Web / App</strong> abrirá una pestaña del navegador para enviar el mensaje de manera 100% segura y gratuita sin limitaciones.
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#030303] flex flex-wrap gap-3 justify-end">
                            <button 
                                onClick={() => setWhatsAppParticipant(null)} 
                                className="px-5 py-2.5 bg-white hover:bg-gray-100 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#1F1F1F] text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSendWhatsAppWeb} 
                                className="px-5 py-2.5 bg-white dark:bg-[#0D0D0D] border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-black dark:hover:text-black hover:border-emerald-500 text-[10px] font-black uppercase tracking-[0.25em] transition-all"
                            >
                                WhatsApp Web / App (Manual)
                            </button>
                            <button 
                                onClick={handleSendWhatsAppAPI} 
                                disabled={sendingWhatsApp}
                                className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-500 text-[10px] font-black uppercase tracking-[0.25em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {sendingWhatsApp ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar Directo (API)'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
