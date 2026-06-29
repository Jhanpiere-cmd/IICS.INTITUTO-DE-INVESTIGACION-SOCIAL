import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Check, Loader2, Award, Star } from 'lucide-react';

interface RecognitionGeneratorProps {
    userId: string;
    userName: string;
    userRole: string;
    title: string;
    description: string;
    issueDate?: string;
    onGenerated?: (pdfUrl: string) => void;
    onError?: (error: string) => void;
    hidePreview?: boolean;
}

export const RecognitionGenerator: React.FC<RecognitionGeneratorProps> = ({
    userId,
    userName,
    userRole,
    title,
    description,
    issueDate,
    onGenerated,
    onError,
    hidePreview = false
}) => {
    const [generating, setGenerating] = useState(false);
    const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
    const [diplomaCode, setDiplomaCode] = useState<string | null>(null);

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!diplomaCode) {
            setDiplomaCode(`REC-${Date.now().toString().substr(-6)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
        }
    }, [diplomaCode]);

    // AUTO-TRIGGER FOR BULK EMISSION
    useEffect(() => {
        if (hidePreview && !generating && !certificateUrl) {
            const timer = setTimeout(() => {
                generatePDF();
            }, 800); // Give some time for assets to stabilize
            return () => clearTimeout(timer);
        }
    }, [hidePreview, generating, certificateUrl]);

    const generatePDF = async () => {
        if (!printRef.current) return;
        setGenerating(true);

        try {
            await document.fonts.ready;

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 1123,
                height: 794,
                windowWidth: 1200
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
            const fileName = `recognition_${userId}_${Date.now()}.pdf`;

            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(fileName, pdfBlob);

            if (uploadError) console.warn('Upload warning:', uploadError);

            const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

            // We update the record in the 'recognitions' table (this logic is usually in the parent, but we keep it for consistency)
            // But actually, we only care about the URL for the parent to save it.

            setCertificateUrl(publicUrl);
            
            if (!hidePreview) {
                pdf.save(`Reconocimiento_ACS_${userName.replace(new RegExp('\\s+', 'g'), '_')}.pdf`);
            }

            if (onGenerated) onGenerated(publicUrl);

        } catch (error: any) {
            console.error('Recognition Error:', error);
            if (onError) onError(error.message || 'Error en generación de PDF');
        } finally {
            setGenerating(false);
        }
    };

    const displayDate = issueDate 
        ? new Date(issueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- RECOGNITION TEMPLATE DESIGN ---
    const RecognitionContent = () => (
        <div
            id="recognition-print-container"
            className="relative bg-white text-slate-900 shadow-none overflow-hidden flex flex-col items-center border-[16px] border-double border-[#1e3a8a]/20"
            style={{ width: '1123px', height: '794px', fontFamily: '"Times New Roman", Times, serif', padding: '60px' }}
        >
            {/* Elegant Background Patterns */}
            <div className="absolute inset-0 bg-[#fdfbf7] pointer-events-none z-0"></div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#1e3a8a 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Formal Borders */}
            <div className="absolute inset-4 border border-[#1e3a8a]/30 z-0"></div>
            <div className="absolute inset-6 border-4 border-[#1e3a8a]/10 z-0"></div>

            {/* Corner Ornaments (Gold Style) */}
            <div className="absolute top-0 left-0 w-32 h-32 z-0 opacity-20">
                <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-[#1e3a8a]"></div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 z-0 opacity-20">
                <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-[#1e3a8a]"></div>
            </div>
            <div className="absolute bottom-0 left-0 w-32 h-32 z-0 opacity-20">
                <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-[#1e3a8a]"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 z-0 opacity-20">
                <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-[#1e3a8a]"></div>
            </div>

            {/* --- CONTENT LAYER --- */}
            <div className="relative z-10 w-full h-full flex flex-col items-center">

                {/* HEADER: University & Faculty */}
                <div className="flex justify-between items-center w-full px-16 h-32 mb-6">
                    <div className="w-28 h-28 flex items-center justify-center">
                        <img src="/certificates/logo-unc/R.png" alt="UNC" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>

                    <div className="text-center flex-1">
                        <h3 className="text-2xl font-bold text-[#1e3a8a] uppercase tracking-[0.2em] font-serif mb-1">Universidad Nacional de Cajamarca</h3>
                        <h4 className="text-lg font-bold text-slate-600 uppercase tracking-widest font-sans">Facultad de Ciencias Sociales</h4>
                        <div className="h-0.5 w-48 bg-gradient-to-r from-transparent via-[#1e3a8a]/40 to-transparent mx-auto mt-2"></div>
                    </div>

                    <div className="w-28 h-28 flex items-center justify-center">
                        <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                {/* DIPLOMA TITLE */}
                <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="h-px w-20 bg-[#D4AF37]"></div>
                        <p className="text-[#D4AF37] font-bold tracking-[0.5em] text-sm uppercase">Diploma de Honor</p>
                        <div className="h-px w-20 bg-[#D4AF37]"></div>
                    </div>
                    <h1 className="text-7xl font-bold text-[#1e3a8a] font-serif tracking-widest mb-2" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                        RECONOCIMIENTO
                    </h1>
                </div>

                {/* RECIPIENT */}
                <div className="text-center w-full flex flex-col items-center flex-grow">
                    <p className="text-lg text-slate-700 italic font-serif mb-4">Se otorga el presente a:</p>
                    
                    <h2 className="text-5xl font-bold text-slate-900 border-b-2 border-[#D4AF37]/50 px-12 pb-2 inline-block leading-tight mb-6 font-serif">
                        {userName}
                    </h2>

                    <div className="max-w-4xl px-12">
                        <p className="text-lg text-slate-600 font-serif leading-relaxed italic">
                            {description || `En mérito a su destacable desempeño, compromiso y valiosa contribución como ${userRole} en el fortalecimiento institucional de la Revista Científica "Alternativas en Ciencias Sociales".`}
                        </p>
                    </div>

                    <div className="mt-6">
                        <p className="text-[#1e3a8a] font-bold text-xl font-serif">
                            "{title}"
                        </p>
                    </div>
                </div>

                {/* DATE */}
                <div className="w-full text-center mb-2">
                    <p className="text-sm text-slate-700 font-serif italic">Cajamarca, {displayDate}</p>
                </div>

                {/* FOOTER: Signatures */}
                <div className="w-full relative h-40">
                    {/* Signature 1: Decano */}
                    <div className="absolute left-10 bottom-4 flex flex-col items-center w-80 text-center">
                        <div className="h-20 flex items-end justify-center mb-1">
                            <img src="/certificates/firma-decano/firma-decano.png" alt="Firma Decano" style={{ maxHeight: '75px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="w-full h-[1.5px] bg-[#1e3a8a]/60 mb-2"></div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">Dr. Elfer German Miranda Valdivia</p>
                        <p className="text-slate-500 text-[9px] uppercase tracking-tighter mt-1">Decano de la Facultad de Ciencias Sociales</p>
                    </div>

                    {/* Center Seal / Logo */}
                    <div className="absolute left-1/2 bottom-12 transform -translate-x-1/2 w-24 flex justify-center items-center h-24 bg-white rounded-full border-4 border-[#D4AF37]/20 shadow-inner">
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', opacity: 0.9 }} />
                    </div>

                    {/* Signature 2: Directora */}
                    <div className="absolute right-10 bottom-4 flex flex-col items-center w-80 text-center">
                        <div className="h-20 flex items-end justify-center mb-1">
                            <img src="/certificates/firma-directora/firma-doctora-Doris.png" alt="Firma Directora" style={{ maxHeight: '85px', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="w-full h-[1.5px] bg-[#1e3a8a]/60 mb-2"></div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">Dra. Doris Castañeda Abanto</p>
                        <p className="text-slate-500 text-[9px] uppercase tracking-tighter mt-1">Directora de la Revista ACS & Unidad de Investigación</p>
                    </div>
                </div>

                {/* Unique ID */}
                <div className="absolute bottom-4 right-6 text-[10px] text-slate-400 font-mono opacity-50">
                    ID VERIFICACIÓN: {diplomaCode}
                </div>
            </div>
        </div>
    );

    // Scaling logic for preview
    const [scale, setScale] = useState(0.4);
    const [previewHeight, setPreviewHeight] = useState('320px');

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            let nScale = 0.4;
            if (width < 640) nScale = 0.25;
            else if (width < 1024) nScale = 0.35;
            setScale(nScale);
            setPreviewHeight(`${794 * nScale}px`);
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    if (hidePreview) {
        return (
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -50 }}>
                <div ref={printRef}>
                    <RecognitionContent />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            {/* Visual Preview */}
            <div className="w-full overflow-hidden bg-black/40 p-4 rounded-xl border border-white/5 shadow-2xl flex justify-center relative">
                <div style={{ width: '1123px', height: '794px', transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `calc(${previewHeight} - 794px)` }}>
                    <RecognitionContent />
                </div>
            </div>

            {/* Hidden Target for Capture */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -50 }}>
                <div ref={printRef}>
                    <RecognitionContent />
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={generatePDF}
                    disabled={generating}
                    className="py-3 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full font-bold shadow-lg transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    {generating ? <Loader2 className="animate-spin w-5 h-5" /> : <Award className="w-5 h-5" />}
                    {generating ? 'Generando Diploma...' : 'Descargar Reconocimiento'}
                </button>
                {certificateUrl && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-pulse">
                        <Check className="w-4 h-4" /> Diploma guardado en el sistema
                    </div>
                )}
            </div>
        </div>
    );
};
