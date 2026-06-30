import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Check, Loader2 } from 'lucide-react';
import { useToast } from '../ui/ToastContext';

interface CertificateGeneratorProps {
    userId: string;
    courseId: string;
    courseName: string;
    userName: string;
    userRole: string;
    onGenerated?: (pdfUrl: string) => void;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
    userId,
    courseId,
    courseName,
    userName,
    userRole,
    onGenerated
}) => {
    const { toast } = useToast();
    const [generating, setGenerating] = useState(false);
    const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
    const [certificateCode, setCertificateCode] = useState<string | null>(null);

    // TWO Refs: One for the visual preview, one for the robust PDF generation
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!certificateCode) {
            setCertificateCode(`CERT-${Date.now().toString().substr(-6)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
        }
    }, [certificateCode]);

    const generatePDF = async () => {
        if (!printRef.current) return;
        setGenerating(true);

        try {
            // Force fonts/images to be ready
            await document.fonts.ready;

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 1123,
                height: 794,
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    // Extra safety: force display block on hidden elements if needed
                    const el = clonedDoc.getElementById('print-container');
                    if (el) el.style.display = 'block';
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = 297;
            const pdfHeight = 210;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const pdfBlob = pdf.output('blob');
            const fileName = `certificate_${userId}_${courseId}_${Date.now()}.pdf`;

            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(fileName, pdfBlob);

            if (uploadError) console.warn('Upload warning:', uploadError);

            const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

            await supabase.from('certificates').upsert({
                user_id: userId,
                course_id: courseId,
                certificate_code: certificateCode,
                pdf_url: publicUrl
            }, { onConflict: 'user_id,course_id' });

            setCertificateUrl(publicUrl);
            pdf.save(`Certificado_ACS_${userName.replace(new RegExp('\\s+', 'g'), '_')}.pdf`);

            if (onGenerated) onGenerated(publicUrl);

        } catch (error) {
            console.error('Certificate Error:', error);
            toast('error', 'Hubo un error generando el certificado.');
        } finally {
            setGenerating(false);
        }
    };

    const currentDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- SHARED COMPONENT FOR RENDER ---
    const CertificateContent = () => (
        <div
            id="print-container"
            className="relative bg-white text-slate-900 shadow-none overflow-hidden flex flex-col items-center"
            style={{ width: '1123px', height: '794px', fontFamily: '"Times New Roman", Times, serif', padding: '64px', paddingTop: '80px' }}
        >
            {/* Background Decor */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50/30 pointer-events-none z-0"></div>
            <div className="absolute top-0 left-0 w-full h-3 bg-blue-900 z-0"></div>
            <div className="absolute bottom-0 left-0 w-full h-5 bg-blue-900 z-0"></div>

            {/* Corner Ornaments */}
            <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-blue-900/20 m-6 z-0"></div>
            <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-blue-900/20 m-6 z-0"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-blue-900/20 m-6 z-0"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-blue-900/20 m-6 z-0"></div>

            {/* --- CONTENT LAYER (z-10) --- */}
            <div className="relative z-10 w-full h-full flex flex-col items-center">

                {/* HEADER: Logos + University Name */}
                <div className="flex justify-between items-center w-full px-12 h-28 mb-4">
                    {/* Use explicit styling for images to prevent stretching */}
                    <div className="w-24 h-24 flex items-center justify-center">
                        <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>

                    <div className="text-center pt-2">
                        <h3 className="text-2xl font-bold text-slate-700 uppercase tracking-widest font-sans">Instituto de Investigación Científica Social</h3>
                        <h4 className="text-xl font-bold text-slate-600 uppercase tracking-wider font-sans mt-1">IICS - Observatorio y Laboratorio</h4>
                    </div>

                    <div className="w-24 h-24 flex items-center justify-center">
                        <img src="/certificates/logo-unc/R.png" alt="UNC" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                {/* BODY Content - Explicit Margins */}
                <div className="text-center w-full mt-2 flex flex-col items-center flex-grow">

                    <p className="text-sm italic text-slate-600 font-serif mb-4">
                        La Revista "Alternativas en Ciencias Sociales" otorga el presente
                    </p>

                    {/* Title Block - Reverted to Standard Serif with MORE SPACING */}
                    <div className="flex flex-col items-center mb-10 relative">
                        <h1 className="text-6xl md:text-7xl font-bold text-[#1e3a8a] font-serif tracking-wider leading-relaxed">
                            CERTIFICADO
                        </h1>
                        <span className="text-xs font-bold text-blue-900/60 uppercase tracking-[0.6em] font-sans mt-4 block">
                            DE FINALIZACIÓN
                        </span>
                    </div>

                    <p className="text-base text-slate-700 font-serif mb-2">A:</p>

                    <h2 className="text-4xl font-bold text-slate-900 italic font-serif border-b-2 border-slate-300 pb-1 px-8 inline-block max-w-4xl leading-tight mb-4">
                        {userName}
                    </h2>

                    <p className="text-base text-slate-600 font-serif mb-2">
                        Por haber completado satisfactoriamente el curso de capacitación:
                    </p>

                    <h3 className="text-3xl font-bold text-indigo-800 leading-tight px-4 max-w-5xl mb-4">
                        "{courseName}"
                    </h3>
                </div>

                {/* FOOTER: Date & Signatures - Moved Up Significantly */}
                <div className="w-full pb-12">

                    <div className="text-right pr-20 mb-2">
                        <p className="text-sm text-slate-700 font-serif">Cajamarca, {currentDate}</p>
                    </div>

                    {/* Left Signature: Decano */}
                    <div className="absolute left-10 bottom-6 flex flex-col items-center w-80 text-center">
                        <div className="h-24 flex items-end justify-center mb-1">
                            <img src="/certificates/firma-decano/firma-decano.png" alt="Firma Decano" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="w-full h-px bg-slate-900 mb-2"></div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">Dr. Elfer German<br />Miranda Valdivia</p>
                        <p className="text-slate-600 text-[10px] uppercase mt-0.5">Decano Facultad Ciencias Sociales</p>
                    </div>

                    {/* Center Logo - STRICT Size Control */}
                    <div className="absolute left-1/2 bottom-12 transform -translate-x-1/2 w-28 flex justify-center items-end h-20">
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain', opacity: 0.9 }} />
                    </div>

                    {/* Right Signature: Directora */}
                    <div className="absolute right-10 bottom-6 flex flex-col items-center w-80 text-center">
                        <div className="h-24 flex items-end justify-center mb-1">
                            <img src="/certificates/firma-directora/firma-doctora-Doris.png" alt="Firma Directora" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="w-full h-px bg-slate-900 mb-2"></div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">Dra. Doris<br />Castañeda Abanto</p>
                        <p className="text-slate-600 text-[10px] uppercase mt-0.5">Directora Revista ACS &<br />Unidad Investigación</p>
                    </div>

                </div>

                {/* Verification Code */}
                <div className="absolute bottom-8 right-8 text-xs text-slate-400 font-mono">
                    ID: {certificateCode}
                </div>
            </div>
        </div>
    );

    // Dynamic Scale for responsive preview
    const [scale, setScale] = useState(0.35); // Default desktop
    const [marginBottom, setMarginBottom] = useState('-510px');

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            let newScale = 0.35;

            if (width < 500) {
                newScale = 0.22; // Mobile very small
            } else if (width < 768) {
                newScale = 0.28; // Tablet/Large Phone
            } else {
                newScale = 0.35; // Laptop/Desktop
            }

            setScale(newScale);

            // Calculate negative margin to remove dead space from transform scaling
            // Original Height: 794px
            // Visual Height: 794 * scale
            // Space to remove: 794 - (794 * scale)
            const hiddenHeight = 794 * (1 - newScale);
            setMarginBottom(`-${Math.round(hiddenHeight) + 20}px`); // +20 for extra safety
        };

        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex flex-col items-center space-y-4 w-full">

            {/* --- VISUAL PREVIEW --- */}
            <div className="w-full overflow-hidden bg-[#0D0D0D] p-2 md:p-4 rounded-none border border-[#262626] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex justify-center relative group hover:border-exec-blue transition-all">
                <div style={{ width: '1123px', height: '794px', transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: marginBottom }}>
                    <div className="shadow-2xl">
                        <CertificateContent />
                    </div>
                </div>
            </div>

            {/* --- HIDDEN CAPTURE TARGET --- */}
            <div
                style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -50, width: '1123px', height: '794px' }}
            >
                <div ref={printRef}>
                    <CertificateContent />
                </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex gap-4 w-full max-w-md">
                <button
                    onClick={generatePDF}
                    disabled={generating}
                    className="flex-1 py-3 px-6 bg-exec-blue hover:bg-blue-500 text-white rounded-none shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)] border border-exec-blue font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm"
                >
                    {generating ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
                    {generating ? 'GENERANDO PDF...' : 'DESCARGAR CERTIFICADO'}
                </button>
            </div>
            {certificateUrl && (
                <p className="text-green-400 text-sm flex items-center gap-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] font-bold tracking-wide">
                    <Check className="w-4 h-4" /> Certificado listo
                </p>
            )}
        </div>
    );
};
