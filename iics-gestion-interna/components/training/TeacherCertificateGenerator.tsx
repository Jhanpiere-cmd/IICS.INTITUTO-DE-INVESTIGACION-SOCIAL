import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Check, Loader2 } from 'lucide-react';
import { useToast } from '../ui/ToastContext';

interface TeacherCertificateGeneratorProps {
    userId: string;
    courseId: string;
    courseName: string;
    userName: string;
    courseHours?: number;
    studentCount?: number;
    onGenerated?: (pdfUrl: string) => void;
}

export const TeacherCertificateGenerator: React.FC<TeacherCertificateGeneratorProps> = ({
    userId,
    courseId,
    courseName,
    userName,
    courseHours = 0,
    studentCount = 0,
    onGenerated
}) => {
    const { toast } = useToast();
    const [generating, setGenerating] = useState(false);
    const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
    const [certificateCode, setCertificateCode] = useState<string | null>(null);

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!certificateCode) {
            setCertificateCode(`CERT-DOC-${Date.now().toString().substr(-6)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
        }
    }, [certificateCode]);

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
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('print-container-teacher');
                    if (el) {
                        el.style.display = 'block';
                        el.style.transform = 'none';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');

            // Usar configuración A4 landscape estándar
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Dimensiones A4 landscape: 297mm x 210mm
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const pdfBlob = pdf.output('blob');
            const fileName = `certificate_teacher_${userId}_${courseId}_${Date.now()}.pdf`;

            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(fileName, pdfBlob);

            if (uploadError) console.warn('Upload warning:', uploadError);

            const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

            // Guardar en tabla certificates con tipo "teacher"
            await supabase.from('certificates').upsert({
                user_id: userId,
                course_id: courseId,
                certificate_code: certificateCode,
                pdf_url: publicUrl,
                certificate_type: 'teacher' // Columna nueva
            }, { onConflict: 'user_id,course_id' });

            setCertificateUrl(publicUrl);
            pdf.save(`Certificado_Docente_ACS_${userName.replace(/\\s+/g, '_')}.pdf`);

            if (onGenerated) onGenerated(publicUrl);

        } catch (error) {
            console.error('Certificate Error:', error);
            toast('error', 'Hubo un error generando el certificado de docente.');
        } finally {
            setGenerating(false);
        }
    };

    const currentDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    const CertificateContent = () => (
        <div
            id="print-container-teacher"
            className="relative bg-white text-slate-900 shadow-none overflow-hidden flex flex-col items-center"
            style={{ width: '1123px', height: '794px', fontFamily: '"Times New Roman", Times, serif', padding: '64px', paddingTop: '80px' }}
        >
            {/* Background Decor */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-indigo-50/30 pointer-events-none z-0"></div>
            <div className="absolute top-0 left-0 w-full h-3 bg-indigo-900 z-0"></div>
            <div className="absolute bottom-0 left-0 w-full h-5 bg-indigo-900 z-0"></div>

            {/* Corner Ornaments */}
            <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-indigo-900/20 m-6 z-0"></div>
            <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-indigo-900/20 m-6 z-0"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-indigo-900/20 m-6 z-0"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-indigo-900/20 m-6 z-0"></div>

            {/* CONTENT LAYER */}
            <div className="relative z-10 w-full h-full flex flex-col items-center">

                {/* HEADER: Logos + University Name */}
                <div className="flex justify-between items-center w-full px-12 h-28 mb-4">
                    <div className="w-24 h-24 flex items-center justify-center">
                        <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>

                    <div className="text-center pt-2">
                        <h3 className="text-2xl font-bold text-slate-700 uppercase tracking-widest font-sans">Universidad Nacional de Cajamarca</h3>
                        <h4 className="text-xl font-bold text-slate-600 uppercase tracking-wider font-sans mt-1">Facultad de Ciencias Sociales</h4>
                    </div>

                    <div className="w-24 h-24 flex items-center justify-center">
                        <img src="/certificates/logo-unc/R.png" alt="UNC" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                {/* BODY Content */}
                <div className="text-center w-full mt-2 flex flex-col items-center flex-grow">

                    <p className="text-sm italic text-slate-600 font-serif mb-4">
                        La Revista "Alternativas en Ciencias Sociales" otorga el presente
                    </p>

                    {/* Title Block - CERTIFICADO DE DOCENTE */}
                    <div className="flex flex-col items-center mb-6 relative">
                        <h1 className="text-5xl md:text-6xl font-bold text-[#4338ca] font-serif tracking-wider leading-relaxed">
                            CERTIFICADO
                        </h1>
                        <span className="text-xs font-bold text-indigo-900/60 uppercase tracking-[0.6em] font-sans mt-3 block">
                            DE DOCENTE CAPACITADOR
                        </span>
                    </div>

                    <p className="text-base text-slate-700 font-serif mb-2">A:</p>

                    <h2 className="text-4xl font-bold text-slate-900 italic font-serif border-b-2 border-slate-300 pb-1 px-8 inline-block max-w-4xl leading-tight mb-4">
                        {userName}
                    </h2>

                    <p className="text-base text-slate-600 font-serif mb-2 px-8 max-w-5xl leading-relaxed">
                        Por haber dictado satisfactoriamente el curso de capacitación:
                    </p>

                    <h3 className="text-3xl font-bold text-indigo-800 leading-tight px-4 max-w-5xl mb-4">
                        "{courseName}"
                    </h3>

                    {/* Información adicional del curso */}
                    <div className="flex gap-8 mt-3 text-slate-600 text-sm">
                        {courseHours > 0 && (
                            <div className="flex flex-col items-center">
                                <p className="font-bold text-indigo-700">{courseHours} horas</p>
                                <p className="text-xs uppercase">Duración</p>
                            </div>
                        )}
                        {studentCount > 0 && (
                            <div className="flex flex-col items-center">
                                <p className="font-bold text-indigo-700">{studentCount} estudiantes</p>
                                <p className="text-xs uppercase">Capacitados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER: Date & Signatures */}
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

                    {/* Center Logo */}
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

    const [scale, setScale] = useState(0.35);
    const [marginBottom, setMarginBottom] = useState('-510px');

    useEffect(() => {
        const updateScale = () => {
            const w = window.innerWidth;
            if (w < 640) { setScale(0.28); setMarginBottom('-575px'); }
            else if (w < 1024) { setScale(0.30); setMarginBottom('-560px'); }
            else { setScale(0.35); setMarginBottom('-510px'); }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    return (
        <div className="flex flex-col items-center space-y-4 w-full">

            {/* --- VISUAL PREVIEW --- */}
            <div className="w-full overflow-hidden bg-[#0D0D0D] p-2 md:p-4 rounded-none border border-[#262626] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex justify-center relative group hover:border-exec-blue transition-all">
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

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full max-w-md">
                {certificateUrl && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-none flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <Check className="w-5 h-5 text-emerald-400" />
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                Certificado de Docente Generado
                            </p>
                            <a
                                href={certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-300 underline hover:text-white transition-colors"
                            >
                                Ver certificado
                            </a>
                        </div>
                    </div>
                )}

                <button
                    onClick={generatePDF}
                    disabled={generating}
                    className="w-full py-3 px-4 bg-exec-blue text-white rounded-none font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,136,255,0.3)] hover:shadow-[0_0_30px_rgba(0,136,255,0.5)] border border-exec-blue flex items-center justify-center gap-2 text-[10px]"
                >
                    {generating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            GENERANDO...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            GENERAR CERTIFICADO DE DOCENTE
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
