import React, { useRef, useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import QRCode from 'qrcode';

interface CertificatePreviewCardProps {
    participantName: string;
    eventTitle: string;
    eventDate: string;
    /** 'acs' (azul) | 'colegio_sociologo_unidad' (rojo vino) | 'revista_la_colmena' (azul eléctrico/amarillo) */
    organizerType?: 'acs' | 'colegio_sociologo_unidad' | 'revista_la_colmena';
    eventType?: string;
    instructorName?: string;
    instructorRole?: string;
    certCode?: string;
    participantId?: string;
    category?: string;
}

/**
 * Vista previa visual del certificado (HTML/CSS, no PDF).
 * Responsive: escala automáticamente al ancho del contenedor.
 */
export function CertificatePreviewCard({
    participantName,
    eventTitle,
    eventDate,
    organizerType = 'acs',
    eventType = 'otro',
    instructorName,
    instructorRole,
    certCode,
    participantId,
    category = 'participante_general',
}: CertificatePreviewCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [qrUrl, setQrUrl] = useState<string>('');

    const categorySubtitle = (() => {
        const cat = category?.toLowerCase();
        if (cat === 'organizador') return 'DE ORGANIZADOR';
        if (cat === 'co_organizador') return 'DE CO-ORGANIZADOR';
        if (cat === 'ponente') return 'DE PONENTE';
        if (cat === 'comentarista') return 'DE COMENTARISTA';
        if (cat === 'artista_invitado') return 'DE ARTISTA INVITADO';
        return 'DE PARTICIPACIÓN';
    })();

    const categoryLabel = (() => {
        const labels: Record<string, string> = {
            organizador: 'ORGANIZADOR',
            co_organizador: 'CO-ORGANIZADOR',
            ponente: 'PONENTE',
            comentarista: 'COMENTARISTA',
            artista_invitado: 'ARTISTA INVITADO',
            participante_general: 'PARTICIPANTE',
            participante: 'PARTICIPANTE',
        };
        return labels[category?.toLowerCase()] || category?.toUpperCase() || 'PARTICIPANTE';
    })();

    // Generar código QR dinámicamente si existe ID de participante
    useEffect(() => {
        if (participantId) {
            const verificationUrl = `${window.location.origin}/verificar/${participantId}`;
            QRCode.toDataURL(verificationUrl, { margin: 1, width: 120 })
                .then(url => setQrUrl(url))
                .catch(err => console.error('Error al generar QR en previsualización:', err));
        } else {
            setQrUrl('');
        }
    }, [participantId]);

    // El certificado base tiene un ancho fijo de 800px (landscape A4 ~842px → usamos 800px).
    // Escalamos el inner para que quepa en el contenedor externo.
    useEffect(() => {
        // Cargar fuentes de Google Fonts dinámicamente para el certificado rediseñado
        const fontId = 'google-fonts-certificate-redesign';
        if (!document.getElementById(fontId)) {
            const link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&display=swap';
            document.head.appendChild(link);
        }

        function resize() {
            if (!containerRef.current || !innerRef.current) return;
            const containerW = containerRef.current.offsetWidth;
            const scale = containerW / 800;
            innerRef.current.style.transform = `scale(${scale})`;
            innerRef.current.style.transformOrigin = 'top left';
            // Ajustar la altura del contenedor externo para que no haya espacio en blanco
            containerRef.current.style.height = `${Math.round(530 * scale)}px`;
        }
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const formattedDate = eventDate
        ? (() => {
            try {
                return new Date(eventDate + 'T00:00:00').toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
            } catch { return eventDate; }
        })()
        : '';

    const displayName = participantName.trim()
        ? participantName.toUpperCase()
        : 'TU NOMBRE APARECERÁ AQUÍ';

    const isPlaceholder = !participantName.trim();

    /* ════════════════════════════════════════════════════════
       Plantilla TALLER PRÁCTICO — Diseño Especial
    ════════════════════════════════════════════════════════ */
    if (eventType?.toLowerCase() === 'taller') {
        return (
            <div ref={containerRef} className="relative w-full overflow-hidden rounded-none">
                <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(10, 37, 64, 0.2)', border: '1px solid rgba(10, 37, 64, 0.4)', color: '#0A2540' }}>
                    <Award size={9} /> Taller Práctico
                </div>

                <div ref={innerRef} style={{ width: 800, height: 530, position: 'relative' }}>
                    {/* Fondo crema/blanco suave */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, #FCFBF9 0%, #F7F5F0 100%)',
                    }} />

                    {/* SVG de fondo decorativo: Paneles curvos, cintas doradas, guilloche y puntos */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <clipPath id="left-panel-clip">
                                <path d="M 0,0 L 90,0 C 40,150 40,380 90,530 L 0,530 Z" />
                            </clipPath>
                            <clipPath id="right-panel-clip">
                                <path d="M 800,0 L 710,0 C 760,150 760,380 710,530 L 800,530 Z" />
                            </clipPath>
                        </defs>

                        {/* Left Navy Panel */}
                        <path d="M 0,0 L 90,0 C 40,150 40,380 90,530 L 0,530 Z" fill="#0A2540" />
                        
                        {/* Guilloche waves inside left panel */}
                        <g clipPath="url(#left-panel-clip)">
                            <path d="M -20,0 C 30,150 30,380 -20,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 0,0 C 50,150 50,380 0,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 20,0 C 70,150 70,380 20,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 40,0 C 90,150 90,380 40,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 60,0 C 110,150 110,380 60,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 80,0 C 130,150 130,380 80,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                        </g>

                        {/* Left ribbons */}
                        <path d="M 90,0 C 40,150 40,380 90,530" fill="none" stroke="#F4982C" strokeWidth="5" />
                        <path d="M 97,0 C 47,150 47,380 97,530" fill="none" stroke="#FEC841" strokeWidth="2" />

                        {/* Right Navy Panel */}
                        <path d="M 800,0 L 710,0 C 760,150 760,380 710,530 L 800,530 Z" fill="#0A2540" />

                        {/* Guilloche waves inside right panel */}
                        <g clipPath="url(#right-panel-clip)">
                            <path d="M 820,0 C 870,150 870,380 820,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 800,0 C 850,150 850,380 800,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 780,0 C 830,150 830,380 780,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 760,0 C 810,150 810,380 760,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 740,0 C 790,150 790,380 740,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                            <path d="M 720,0 C 770,150 770,380 720,530" fill="none" stroke="#FEC841" strokeWidth="0.6" strokeOpacity="0.15" />
                        </g>

                        {/* Right ribbons */}
                        <path d="M 710,0 C 760,150 760,380 710,530" fill="none" stroke="#F4982C" strokeWidth="5" />
                        <path d="M 703,0 C 753,150 753,380 703,530" fill="none" stroke="#FEC841" strokeWidth="2" />

                        {/* Thin golden rectangle border frame */}
                        <rect x="15" y="15" width="770" height="500" fill="none" stroke="#F4982C" strokeWidth="1.2" />

                        {/* 9-dot grid in bottom-right corner */}
                        <g fill="#FEC841">
                            <circle cx="750" cy="460" r="1.8" />
                            <circle cx="762" cy="460" r="1.8" />
                            <circle cx="774" cy="460" r="1.8" />
                            <circle cx="750" cy="472" r="1.8" />
                            <circle cx="762" cy="472" r="1.8" />
                            <circle cx="774" cy="472" r="1.8" />
                            <circle cx="750" cy="484" r="1.8" />
                            <circle cx="762" cy="484" r="1.8" />
                            <circle cx="774" cy="484" r="1.8" />
                        </g>
                    </svg>

                    {/* Contenido principal del certificado */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
                        {/* Logos Cabecera (Symmetric - Left: UNC, Right: Facultad) */}
                        <div style={{ position: 'absolute', top: 37, left: 37, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '50%' }}>
                            <img src="/certificates/logo-unc/R.png" alt="UNC"
                                style={{ height: 44, width: 'auto', objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div style={{ position: 'absolute', top: 37, right: 37, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '50%' }}>
                            <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad"
                                style={{ height: 44, width: 'auto', objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>

                        {/* Encabezado oficial */}
                        <div style={{ position: 'absolute', top: 32, left: 110, right: 110, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '800', fontSize: 16, color: '#0A2540', letterSpacing: '0.8px', margin: 0 }}>
                                UNIVERSIDAD NACIONAL DE CAJAMARCA
                            </p>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '600', fontSize: 11, color: '#C5A059', letterSpacing: '1px', margin: '2px 0 0' }}>
                                FACULTAD DE CIENCIAS SOCIALES
                            </p>
                        </div>

                        {/* Divider Diamonds under header */}
                        <div style={{ position: 'absolute', top: 78, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ color: '#C5A059', fontSize: 7 }}>◆</span>
                            <span style={{ color: '#C5A059', fontSize: 11 }}>◆</span>
                            <span style={{ color: '#C5A059', fontSize: 7 }}>◆</span>
                        </div>

                        {/* CERTIFICADO */}
                        <div style={{ position: 'absolute', top: 98, left: 0, right: 0, textAlign: 'center' }}>
                            <p style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 900, fontSize: 52, color: '#0A2540', letterSpacing: '0.04em', margin: 0, lineHeight: 1 }}>
                                CERTIFICADO
                            </p>
                        </div>

                        {/* Banner de Categoría con swallow-tails */}
                        <div style={{ position: 'absolute', top: 162, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ height: '1.2px', width: '60px', background: '#C5A059', marginRight: '10px' }}></div>
                            <div style={{ position: 'relative', background: '#C5A059', padding: '5px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '150px' }}>
                                <div style={{ position: 'absolute', left: '-10px', top: 0, width: 0, height: 0, borderTop: '12px solid #C5A059', borderBottom: '12px solid #C5A059', borderLeft: '10px solid transparent' }}></div>
                                <div style={{ position: 'absolute', right: '-10px', top: 0, width: 0, height: 0, borderTop: '12px solid #C5A059', borderBottom: '12px solid #C5A059', borderRight: '10px solid transparent' }}></div>
                                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: '800', letterSpacing: '0.12em', color: '#FFFFFF', margin: 0, textTransform: 'uppercase', lineHeight: 1.1 }}>
                                    {categorySubtitle}
                                </p>
                            </div>
                            <div style={{ height: '1.2px', width: '60px', background: '#C5A059', marginLeft: '10px' }}></div>
                        </div>

                        {/* Otorgado a */}
                        <div style={{ position: 'absolute', top: 198, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', color: '#0A2540', fontWeight: '500' }}>
                            Otorgado a
                        </div>

                        {/* Nombre del participante */}
                        <div style={{ position: 'absolute', top: 216, left: 110, right: 110, textAlign: 'center' }}>
                            <p style={{
                                fontFamily: '"Dancing Script", "Brush Script MT", Georgia, serif',
                                fontSize: isPlaceholder ? 38 : 46,
                                color: isPlaceholder ? '#94a3b8' : '#0A2540',
                                margin: 0,
                                lineHeight: 1.2,
                                fontWeight: '700',
                                transition: 'all 0.3s ease',
                            }}>
                                {isPlaceholder ? displayName : displayName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                        </div>

                        {/* Divider Diamonds under name */}
                        <div style={{ position: 'absolute', top: 272, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ color: '#C5A059', fontSize: 7 }}>◆</span>
                            <span style={{ color: '#C5A059', fontSize: 10 }}>◆</span>
                            <span style={{ color: '#C5A059', fontSize: 7 }}>◆</span>
                        </div>

                        {/* Cuerpo de texto taller */}
                        <div style={{ position: 'absolute', top: 292, left: 110, right: 110, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 500, color: '#0A2540', margin: 0, lineHeight: 1.5 }}>
                                Por su participación y aprobación satisfactoria en calidad de <strong>{categoryLabel}</strong> en el Taller Práctico:
                            </p>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '800', fontSize: 14, color: '#0A2540', margin: '6px 0 0', lineHeight: 1.4, letterSpacing: '0.2px' }}>
                                "{eventTitle.toUpperCase() || 'CÓMO ELABORAR UN ENSAYO Y PUBLICARLO'}"
                            </p>
                        </div>

                        {/* Docente */}
                        {instructorName && (
                            <div style={{ position: 'absolute', top: 354, left: 110, right: 110, textAlign: 'center' }}>
                                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, color: '#64748b', margin: 0 }}>
                                    Bajo la dirección del docente:
                                </p>
                                <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'bold', fontSize: 12, color: '#0A2540', margin: '2px 0 0' }}>
                                    {instructorName}
                                </p>
                            </div>
                        )}

                        {/* Fecha con divisor */}
                        <div style={{ position: 'absolute', bottom: 104, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '300px', marginBottom: '8px' }}>
                                <div style={{ height: '0.8px', flex: 1, background: '#C5A059' }}></div>
                                <span style={{ color: '#C5A059', fontSize: 8, margin: '0 8px' }}>◆</span>
                                <div style={{ height: '0.8px', flex: 1, background: '#C5A059' }}></div>
                            </div>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '700', fontSize: 11, color: '#C5A059', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Cajamarca, {formattedDate}
                            </p>
                        </div>

                        {/* Adorno de Laurel Dorado */}
                        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', zIndex: 10 }}>
                            <svg width="80" height="20" viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M 10 10 C 25 7, 55 7, 70 10" stroke="#C5A059" strokeWidth="1.2" fill="none" />
                                <path d="M 35 9 C 32 5, 27 5, 25 8 C 27 10, 32 10, 35 9" fill="#C5A059" />
                                <path d="M 25 10 C 22 6, 17 7, 15 10 C 17 12, 22 12, 25 10" fill="#C5A059" />
                                <path d="M 15 11 C 12 8, 8 9, 6 12 C 8 14, 12 13, 15 11" fill="#C5A059" />
                                <path d="M 45 9 C 48 5, 53 5, 55 8 C 53 10, 48 10, 45 9" fill="#C5A059" />
                                <path d="M 55 10 C 58 6, 63 7, 65 10 C 63 12, 58 12, 55 10" fill="#C5A059" />
                                <path d="M 65 11 C 68 8, 72 9, 74 12 C 72 14, 68 13, 65 11" fill="#C5A059" />
                                <circle cx="40" cy="9" r="1.5" fill="#C5A059" />
                            </svg>
                        </div>

                        {/* QR Code Container */}
                        <div style={{
                            position: 'absolute', bottom: 26, left: 100, width: 70, height: 82,
                            background: '#fff', border: '1.2px solid #C5A059',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '4px 2px 2px', boxSizing: 'border-box',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            zIndex: 25
                        }}>
                            <div style={{
                                width: 58, height: 58,
                                border: '1px solid #e2e8f0',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                background: '#fff', padding: 2, boxSizing: 'border-box'
                            }}>
                                {qrUrl ? (
                                    <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <>
                                        <div style={{ fontSize: 9, fontWeight: 'bold', color: '#0A2540' }}>QR</div>
                                        <div style={{ fontSize: 5, color: '#64748b', textAlign: 'center', lineHeight: 1 }}>VALIDACIÓN</div>
                                    </>
                                )}
                            </div>
                            {certCode && (
                                <div style={{
                                    marginTop: 4,
                                    textAlign: 'center', fontSize: '6px', fontFamily: 'monospace', fontWeight: 'bold',
                                    color: '#C5A059'
                                }}>
                                    {certCode}
                                </div>
                            )}
                        </div>

                        {/* Firma 1 (Decano) */}
                        <div style={{ position: 'absolute', bottom: 24, left: 185, width: 150, textAlign: 'center' }}>
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px', position: 'relative' }}>
                                <img src="/certificates/firma-decano/firma-decano.png" alt="Firma Decano" style={{ height: '60px', objectFit: 'contain', transform: 'rotate(-2deg)', pointerEvents: 'auto', position: 'absolute', bottom: '-26px' }} />
                            </div>
                            <div style={{ borderTop: '1px solid #0A2540', width: 120, margin: '0 auto' }} />
                            <p style={{ marginTop: '4px', fontSize: '9px', fontWeight: '800', color: '#0A2540', textTransform: 'uppercase', margin: 0, letterSpacing: '0.2px' }}>
                                Dr. Elfer G. Miranda V.
                            </p>
                            <p style={{ fontSize: '7px', color: '#64748b', fontWeight: 600, lineHeight: 1.2, textTransform: 'uppercase', margin: 0 }}>
                                DECANO DE LA FACULTAD DE<br/>CIENCIAS SOCIALES
                            </p>
                        </div>

                        {/* ACS Logo */}
                        <div style={{ position: 'absolute', bottom: 24, left: 350, width: 100, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '900', fontSize: '20px', color: '#0A2540', margin: 0, letterSpacing: '1px', lineHeight: 1 }}>
                                ACS
                            </p>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '500', fontSize: '6.5px', color: '#64748b', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                                Actividades en Ciencias Sociales
                            </p>
                        </div>

                        {/* Firma 2 (Directora) */}
                        <div style={{ position: 'absolute', bottom: 24, left: 465, width: 150, textAlign: 'center' }}>
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px', position: 'relative' }}>
                                <img src="/certificates/firma-directora/firma-doctora-Doris.png" alt="Firma Directora" style={{ height: '60px', objectFit: 'contain', transform: 'rotate(-3deg)', pointerEvents: 'auto', position: 'absolute', bottom: '-4px' }} />
                            </div>
                            <div style={{ borderTop: '1px solid #0A2540', width: 120, margin: '0 auto' }} />
                            <p style={{ marginTop: '4px', fontSize: '9px', fontWeight: '800', color: '#0A2540', textTransform: 'uppercase', margin: 0, letterSpacing: '0.2px' }}>
                                Dra. Doris Castañeda A.
                            </p>
                            <p style={{ fontSize: '7px', color: '#64748b', fontWeight: 600, lineHeight: 1.2, textTransform: 'uppercase', margin: 0 }}>
                                DIRECTORA REVISTA ACS
                            </p>
                        </div>

                        {/* Sello Dorado Medal */}
                        <div style={{ position: 'absolute', bottom: 22, left: 630, width: 70, height: 70, zIndex: 30, pointerEvents: 'none' }}>
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M30 70 L20 100 L35 90 L50 100 L40 70 Z" fill="#F4982C"/>
                                <path d="M70 70 L60 100 L50 90 L65 100 L80 100 L70 70 Z" fill="#F4982C"/>
                                <path d="M25 75 L15 95 L25 88 L35 95 L30 75 Z" fill="#FEC841"/>
                                <path d="M75 75 L65 95 L75 88 L85 95 L80 75 Z" fill="#FEC841"/>
                                <path d="M50 10L56.1226 18.3516L66.3816 15.5685L69.3496 25.6841L79.8242 26.0357L79.3551 36.3315L89.4315 39.3496L85.4952 48.8354L94.0205 54.5951L87.2144 62.3168L93.337 70.6685L84.2863 75.5186L87.2543 85.6343L77.1044 87.4912L76.6353 97.7871L66.1607 96.4172L62.2244 105.903L53.0745 101.565L44.9519 108.786L37.731 99.6357L28.2452 103.572L26.8753 93.0974L16.5795 93.5665L18.4364 83.4166L8.32074 80.4486L13.1708 71.3979L4.81912 65.2753L12.5408 58.4692L6.7811 49.9439L16.2669 46.0076L13.2488 35.9312L23.5446 35.4621L23.8962 24.9875L34.0118 27.9555L36.795 17.6965L45.1466 23.8191L50 10Z" fill="#FEC841"/>
                                <path d="M50 14L55.4338 21.4116L64.538 18.9419L67.1725 27.9197L76.4674 28.2318L76.051 37.3705L84.9937 40.0494L81.5002 48.4691L89.0664 53.5815L83.0232 60.4357L88.457 67.8473L80.4222 72.152L83.0567 81.1298L74.0483 82.7774L73.6319 91.916L64.337 90.6999L60.8435 99.1197L52.7237 95.2678L45.5147 101.677L39.105 93.5577L30.6853 97.0512L29.4692 87.7563L20.3305 88.1727L21.9781 79.1643L13.0003 76.5298L17.305 68.495L9.8934 63.0612L16.7476 57.018L11.6352 49.4518L20.0549 45.9583L17.376 37.0156L26.5147 36.5992L26.8268 27.3043L35.8046 29.9388L38.2743 20.8346L45.6859 26.2684L50 14Z" fill="#F4982C"/>
                                <circle cx="50" cy="55" r="28" fill="#fff" fillOpacity="0.15"/>
                                <circle cx="50" cy="55" r="24" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 4"/>
                                <path d="M50 42L52.8214 49.4164L60.641 49.8492L54.5828 54.8394L56.4977 62.4L50 58.1836L43.5023 62.4L45.4172 54.8394L39.359 49.8492L47.1786 49.4164L50 42Z" fill="#fff"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (organizerType === 'acs') {
        return (
            <div ref={containerRef} className="relative w-full overflow-hidden rounded-none">
                <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(21, 58, 191, 0.2)', border: '1px solid rgba(21, 58, 191, 0.4)', color: '#153ABF' }}>
                    <Award size={9} /> Vista Previa
                </div>

                <div ref={innerRef} style={{ width: 800, height: 530, position: 'relative' }}>
                    {/* Fondo blanco puro */}
                    <div style={{ position: 'absolute', inset: 0, background: '#ffffff' }} />

                    {/* Borde doble fino rediseñado */}
                    <div style={{ position: 'absolute', inset: 15, border: '2px solid #153ABF', boxSizing: 'border-box' }} />
                    <div style={{ position: 'absolute', inset: 19, border: '1px solid #F4982C', boxSizing: 'border-box' }} />

                    {/* Esquina Superior Derecha (Geométrica) */}
                    <svg style={{ position: 'absolute', top: 0, right: 0, width: 210, height: 210, zIndex: 20, pointerEvents: 'none' }} viewBox="0 0 200 200" preserveAspectRatio="none">
                        <polygon points="200,0 200,160 40,0" fill="#FEC841"/>
                        <polygon points="200,0 200,145 55,0" fill="#F4982C"/>
                        <polygon points="200,0 200,115 85,0" fill="#153ABF"/>
                        <polygon points="200,0 200,60 140,0" fill="#2263D9"/>
                    </svg>

                    {/* Esquina Inferior Izquierda (Geométrica) */}
                    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: 210, height: 210, zIndex: 20, pointerEvents: 'none' }} viewBox="0 0 200 200" preserveAspectRatio="none">
                        <polygon points="0,200 0,40 160,200" fill="#FEC841"/>
                        <polygon points="0,200 0,55 145,200" fill="#F4982C"/>
                        <polygon points="0,200 0,85 115,200" fill="#153ABF"/>
                        <polygon points="0,200 0,140 60,200" fill="#2263D9"/>
                    </svg>

                    {/* Sello Dorado Inferior Derecho */}
                    <div style={{ position: 'absolute', bottom: 28, right: 28, zIndex: 30, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <svg className="w-[80px] h-[80px] drop-shadow-xl" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M30 70 L20 100 L35 90 L50 100 L40 70 Z" fill="#F4982C"/>
                            <path d="M70 70 L60 100 L50 90 L65 100 L80 100 L70 70 Z" fill="#F4982C"/>
                            <path d="M25 75 L15 95 L25 88 L35 95 L30 75 Z" fill="#FEC841"/>
                            <path d="M75 75 L65 95 L75 88 L85 95 L80 75 Z" fill="#FEC841"/>
                            <path d="M50 10L56.1226 18.3516L66.3816 15.5685L69.3496 25.6841L79.8242 26.0357L79.3551 36.3315L89.4315 39.3496L85.4952 48.8354L94.0205 54.5951L87.2144 62.3168L93.337 70.6685L84.2863 75.5186L87.2543 85.6343L77.1044 87.4912L76.6353 97.7871L66.1607 96.4172L62.2244 105.903L53.0745 101.565L44.9519 108.786L37.731 99.6357L28.2452 103.572L26.8753 93.0974L16.5795 93.5665L18.4364 83.4166L8.32074 80.4486L13.1708 71.3979L4.81912 65.2753L12.5408 58.4692L6.7811 49.9439L16.2669 46.0076L13.2488 35.9312L23.5446 35.4621L23.8962 24.9875L34.0118 27.9555L36.795 17.6965L45.1466 23.8191L50 10Z" fill="#FEC841"/>
                            <path d="M50 14L55.4338 21.4116L64.538 18.9419L67.1725 27.9197L76.4674 28.2318L76.051 37.3705L84.9937 40.0494L81.5002 48.4691L89.0664 53.5815L83.0232 60.4357L88.457 67.8473L80.4222 72.152L83.0567 81.1298L74.0483 82.7774L73.6319 91.916L64.337 90.6999L60.8435 99.1197L52.7237 95.2678L45.5147 101.677L39.105 93.5577L30.6853 97.0512L29.4692 87.7563L20.3305 88.1727L21.9781 79.1643L13.0003 76.5298L17.305 68.495L9.8934 63.0612L16.7476 57.018L11.6352 49.4518L20.0549 45.9583L17.376 37.0156L26.5147 36.5992L26.8268 27.3043L35.8046 29.9388L38.2743 20.8346L45.6859 26.2684L50 14Z" fill="#F4982C"/>
                            <circle cx="50" cy="55" r="28" fill="#fff" fill-opacity="0.15"/>
                            <circle cx="50" cy="55" r="24" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4"/>
                            <path d="M50 42L52.8214 49.4164L60.641 49.8492L54.5828 54.8394L56.4977 62.4L50 58.1836L43.5023 62.4L45.4172 54.8394L39.359 49.8492L47.1786 49.4164L50 42Z" fill="#fff"/>
                        </svg>
                    </div>

                    {/* Contenido (Encima de las esquinas geométricas) */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
                        {/* Logos Cabecera (Symmetric - Left: UNC, Right: Facultad) */}
                        <img src="/certificates/logo-unc/R.png" alt="UNC"
                            style={{ position: 'absolute', top: 30, left: 30, height: 70, width: 'auto', objectFit: 'contain', pointerEvents: 'auto' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad"
                            style={{ position: 'absolute', top: 30, right: 30, height: 70, width: 'auto', objectFit: 'contain', pointerEvents: 'auto' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />

                        {/* Cabecera institucional */}
                        <div style={{ position: 'absolute', top: 36, left: 110, right: 110, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'bold', fontSize: 15, color: '#153ABF', letterSpacing: 0.5, margin: 0 }}>
                                UNIVERSIDAD NACIONAL DE CAJAMARCA
                            </p>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'semibold', fontSize: 11, color: '#F4982C', letterSpacing: 1, margin: '2px 0 0' }}>
                                FACULTAD DE CIENCIAS SOCIALES
                            </p>
                        </div>

                        {/* CERTIFICADO */}
                        <div style={{ position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center' }}>
                            <p style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: 48, color: '#153ABF', letterSpacing: '0.08em', margin: 0, lineHeight: 1 }}>
                                CERTIFICADO
                            </p>
                        </div>

                        {/* Subtítulo con acentos decorativos dorados */}
                        <div style={{ position: 'absolute', top: 168, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{ height: '2px', width: '32px', background: '#F4982C' }}></div>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 'bold', letterSpacing: '0.12em', color: '#F4982C', margin: 0, textTransform: 'uppercase' }}>
                                {categorySubtitle}
                            </p>
                            <div style={{ height: '2px', width: '32px', background: '#F4982C' }}></div>
                        </div>

                        {/* Otorgado a */}
                        <div style={{ position: 'absolute', top: 195, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: '#153ABF', fontWeight: 500 }}>
                            Otorgado a
                        </div>

                        {/* Nombre del participante */}
                        <div style={{ position: 'absolute', top: 212, left: 40, right: 40, textAlign: 'center' }}>
                            <p style={{
                                fontFamily: '"Dancing Script", "Brush Script MT", Georgia, serif',
                                fontSize: isPlaceholder ? 36 : 48,
                                color: isPlaceholder ? '#94a3b8' : '#153ABF',
                                margin: 0,
                                lineHeight: 1.2,
                                paddingBottom: '4px',
                                transition: 'all 0.3s ease',
                            }}>
                                {isPlaceholder ? displayName : displayName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                            <div style={{
                                width: '60%', height: 1.5, margin: '0 auto',
                                background: isPlaceholder ? '#e2e8f0' : '#2263D9',
                            }} />
                        </div>

                        {/* Cuerpo de texto */}
                        <div style={{ position: 'absolute', top: 292, left: 60, right: 60, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 500, color: '#153ABF', margin: 0, lineHeight: 1.5 }}>
                                Por su destacada participación en calidad de <strong>{categoryLabel}</strong> en el evento:
                            </p>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'bold', fontSize: 14, color: '#153ABF', margin: '6px 0 0', lineHeight: 1.4, letterSpacing: '0.2px' }}>
                                "{eventTitle || 'NOMBRE DEL EVENTO'}"
                            </p>
                        </div>

                        {/* Fecha */}
                        <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'bold', fontSize: 11, color: '#F4982C', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Cajamarca, {formattedDate}
                            </p>
                        </div>

                        {/* Pie de firmas y logos */}
                        {/* QR and Code Container with solid white background to cover corner triangles */}
                        <div style={{
                            position: 'absolute', bottom: 10, left: 30, width: 70, height: 82,
                            background: '#fff', border: '1px solid #153ABF',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '4px 2px 2px', boxSizing: 'border-box'
                        }}>
                            <div style={{
                                width: 58, height: 58,
                                border: '1px solid #153ABF',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                background: '#fff', padding: 2, boxSizing: 'border-box'
                            }}>
                                {qrUrl ? (
                                    <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <>
                                        <div style={{ fontSize: 9, fontWeight: 'bold', color: '#153ABF' }}>QR</div>
                                        <div style={{ fontSize: 5, color: '#64748b', textAlign: 'center', lineHeight: 1 }}>VALIDACIÓN</div>
                                    </>
                                )}
                            </div>
                            {certCode && (
                                <div style={{
                                    marginTop: 4,
                                    textAlign: 'center', fontSize: '6.5px', fontFamily: 'monospace', fontWeight: 'bold',
                                    color: '#153ABF'
                                }}>
                                    {certCode}
                                </div>
                            )}
                        </div>

                        {/* Firma 1 (Decano) */}
                        <div style={{ position: 'absolute', bottom: 26, left: 100, width: 180, textAlign: 'center' }}>
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}>
                                <img src="/certificates/firma-decano/firma-decano.png" alt="Firma Decano" style={{ height: '65px', objectFit: 'contain', transform: 'rotate(-2deg)', pointerEvents: 'auto', position: 'absolute', bottom: '-26px' }} />
                            </div>
                            <div style={{ borderTop: '1px solid #153ABF', width: 140, margin: '0 auto' }} />
                            <p style={{ marginTop: '4px', fontSize: '9px', fontWeight: 'bold', color: '#153ABF', textTransform: 'uppercase', margin: 0 }}>
                                Dr. Elfer G. Miranda V.
                            </p>
                            <p style={{ fontSize: '7px', color: '#475569', fontWeight: 500, lineHeight: 1.2, textTransform: 'uppercase', margin: 0 }}>
                                DECANO DE LA FACULTAD DE<br/>CIENCIAS SOCIALES
                            </p>
                        </div>

                        {/* Logo Oficial ACS (Original PNG) */}
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS"
                            style={{
                                position: 'absolute',
                                bottom: 26,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                height: 35,
                                objectFit: 'contain',
                                pointerEvents: 'auto'
                            }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />

                        {/* Firma 2 (Directora) */}
                        <div style={{ position: 'absolute', bottom: 26, left: 520, width: 180, textAlign: 'center' }}>
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}>
                                <img src="/certificates/firma-directora/firma-doctora-Doris.png" alt="Firma Directora" style={{ height: '65px', objectFit: 'contain', transform: 'rotate(-3deg)', pointerEvents: 'auto', position: 'absolute', bottom: '-5px' }} />
                            </div>
                            <div style={{ borderTop: '1px solid #153ABF', width: 140, margin: '0 auto' }} />
                            <p style={{ marginTop: '4px', fontSize: '9px', fontWeight: 'bold', color: '#153ABF', textTransform: 'uppercase', margin: 0 }}>
                                Dra. Doris Castañeda A.
                            </p>
                            <p style={{ fontSize: '7px', color: '#475569', fontWeight: 500, lineHeight: 1.2, textTransform: 'uppercase', margin: 0 }}>
                                DIRECTORA REVISTA ACS
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════
       Plantilla Alianza Colegio de Sociólogos + Unidad — Rojo vino
    ════════════════════════════════════════════════════════ */
    if (organizerType === 'colegio_sociologo_unidad') {
        return (
            <div ref={containerRef} className="relative w-full overflow-hidden rounded-none">
                {/* Badge */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(139,0,0,0.2)', border: '1px solid rgba(139,0,0,0.4)', color: '#fca5a5' }}>
                    <Award size={9} /> Alianza Institucional
                </div>

                {/* Inner fixed-size certificate — 800×530px */}
                <div ref={innerRef} style={{ width: 800, height: 530, position: 'relative' }}>
                    {/* Fondo crema cálido */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: '#FCF8F2',
                    }} />

                    {/* Banda superior rojo vino */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 106,
                        background: '#8B0000',
                    }} />

                    {/* Banda inferior rojo vino delgada */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 45,
                        background: '#8B0000',
                    }} />

                    {/* Marco exterior borde rojo vino */}
                    <div style={{
                        position: 'absolute', inset: 15,
                        border: '5px solid #8B0000',
                        boxSizing: 'border-box',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }} />

                    {/* Logos Cabecera */}
                    <img src="/certificates/logo-colegio-v2/Logo colegio de sociologos cajamarca.png" alt="Colegio de Sociólogos"
                        style={{ position: 'absolute', top: -20, left: -25, height: 156, width: 'auto', objectFit: 'contain', zIndex: 15 }} />
                    
                    <img src="/certificates/logo-unidad-v2/Logo de la unidad de investigacion, de la facultad de ciencias sociales. sin fondo blanco.png" alt="Unidad de Investigación"
                        style={{ position: 'absolute', top: 12, right: 35, height: 80, width: 'auto', objectFit: 'contain', zIndex: 15 }} />

                    {/* Título en la banda superior */}
                    <div style={{ position: 'absolute', top: 40, left: 160, right: 200, textAlign: 'center', zIndex: 20 }}>
                        <p style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 16, color: '#FFF5DC', letterSpacing: '0.5px', margin: 0 }}>
                            Colegio de Sociólogos del Perú | Región Cajamarca
                        </p>
                    </div>

                    {/* Contenido principal */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
                        {/* CERTIFICADO */}
                        <div style={{ position: 'absolute', top: 155, left: 0, right: 0, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 50, color: '#8B0000', margin: 0, lineHeight: 1 }}>
                                CERTIFICADO
                            </p>
                            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: '#646464', margin: '10px 0 0' }}>
                                Otorgado en calidad de: <strong style={{ color: '#8B0000' }}>{categoryLabel}</strong>
                            </p>
                            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#3c3c3c', margin: '22px 0 0' }}>
                                Se otorga el presente a:
                            </p>
                        </div>

                        {/* Nombre del participante */}
                        <div style={{ position: 'absolute', top: 265, left: 40, right: 40, textAlign: 'center' }}>
                            <p style={{
                                fontFamily: 'Georgia, serif',
                                fontWeight: 'bold', fontStyle: 'italic',
                                fontSize: displayName.length > 25 ? 30 : 38,
                                color: isPlaceholder ? '#ccc' : '#000000',
                                margin: 0,
                                lineHeight: 1.1,
                                textTransform: 'uppercase'
                            }}>
                                {displayName}
                            </p>
                        </div>

                        {/* Detalle del evento */}
                        <div style={{ position: 'absolute', top: 312, left: 60, right: 60, textAlign: 'center' }}>
                            <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#3c3c3c', margin: 0 }}>
                                Por su participación en el evento:
                            </p>
                            <p style={{
                                fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 16,
                                color: '#8B0000', margin: '6px 0 0', lineHeight: 1.3,
                            }}>
                                "{eventTitle || 'Nombre del Evento'}"
                            </p>
                            {formattedDate && (
                                <p style={{
                                    fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11,
                                    color: '#646464', margin: '12px 0 0'
                                }}>
                                    Realizado el día {formattedDate}
                                </p>
                            )}
                        </div>

                        {/* Logo Revista ACS Abajo */}
                        <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="Revista ACS"
                            style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', height: 25, objectFit: 'contain', pointerEvents: 'auto' }} />

                        {/* Firmas y QR */}
                        {/* QR Code bottom left (on top of bottom band but inside border) */}
                        <div style={{
                            position: 'absolute', bottom: 15, right: 30, width: 38, height: 38,
                            border: '1.5px solid #8B0000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '#fff', padding: 2
                        }}>
                            {qrUrl ? (
                                <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ fontSize: 8, fontWeight: 'bold', color: '#8B0000' }}>QR</span>
                            )}
                        </div>

                        {/* Firma 1 (Decano) */}
                        <div style={{ position: 'absolute', bottom: 50, left: 100, width: 180, textAlign: 'center' }}>
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}>
                                <img src="/certificates/firma-decano/firma-decano.png" alt="Firma Decano" style={{ height: '55px', objectFit: 'contain', pointerEvents: 'auto', position: 'absolute', bottom: '-15px' }} />
                            </div>
                            <div style={{ borderTop: '1px solid #8B0000', width: 140, margin: '0 auto' }} />
                            <p style={{ marginTop: '4px', fontSize: '9px', fontWeight: 'bold', color: '#8B0000', textTransform: 'uppercase', margin: 0 }}>
                                Dr. Elfer G. Miranda V.
                            </p>
                            <p style={{ fontSize: '7px', color: '#475569', fontWeight: 500, lineHeight: 1.2, textTransform: 'uppercase', margin: 0 }}>
                                DECANO DE LA FACULTAD DE<br/>CIENCIAS SOCIALES
                            </p>
                        </div>

                        {/* Firma 2 (Directora) */}
                        <div style={{ position: 'absolute', bottom: 50, left: 520, width: 180, textAlign: 'center' }}>
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}>
                                <img src="/certificates/firma-directora/firma-doctora-Doris.png" alt="Firma Directora" style={{ height: '55px', objectFit: 'contain', pointerEvents: 'auto', position: 'absolute', bottom: '-5px' }} />
                            </div>
                            <div style={{ borderTop: '1px solid #8B0000', width: 140, margin: '0 auto' }} />
                            <p style={{ marginTop: '4px', fontSize: '9px', fontWeight: 'bold', color: '#8B0000', textTransform: 'uppercase', margin: 0 }}>
                                Dra. Doris Castañeda A.
                            </p>
                            <p style={{ fontSize: '7px', color: '#475569', fontWeight: 500, lineHeight: 1.2, textTransform: 'uppercase', margin: 0 }}>
                                DIRECTORA REVISTA ACS
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════
       Plantilla Revista La Colmena — Azul Eléctrico + Amarillo
    ════════════════════════════════════════════════════════ */
    return (
        <div ref={containerRef} className="relative w-full overflow-hidden rounded-none">
            {/* Badge */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.4)', color: '#22d3ee' }}>
                <Award size={9} /> Alianza Institucional
            </div>

            {/* Inner fixed-size — 800×530px */}
            <div ref={innerRef} style={{ width: 800, height: 530, position: 'relative' }}>
                {/* Fondo blanco puro */}
                <div style={{ position: 'absolute', inset: 0, background: '#ffffff' }} />

                {/* Decoración lateral Azul Eléctrico */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, background: '#003366' }} />
                <div style={{ position: 'absolute', top: 0, left: 40, bottom: 0, width: 4, background: '#FFD700' }} />

                {/* Borde exterior fino */}
                <div style={{ position: 'absolute', inset: 15, border: '1px solid #003366', boxSizing: 'border-box' }} />

                {/* Logos Cabecera */}
                <div style={{ position: 'absolute', top: 28, left: 65, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/certificates/logo-la-colmena/logo-la-colmena-icono.png" alt="La Colmena Icono" 
                        style={{ height: 42, objectFit: 'contain' }} />
                    <img src="/certificates/logo-la-colmena/logo-la-colmena-texto.png" alt="La Colmena Texto" 
                        style={{ height: 26, objectFit: 'contain', marginTop: 4 }} />
                </div>
                <div style={{ position: 'absolute', top: 35, left: 245, width: 1, height: 35, background: '#e2e8f0' }} />
                <img src="/certificates/logo-revista/logo-revista-ACS.png" alt="ACS" 
                    style={{ position: 'absolute', top: 38, left: 260, height: 30, objectFit: 'contain' }} />

                {/* Cabecera Texto */}
                <div style={{ position: 'absolute', top: 35, right: 40, textAlign: 'right' }}>
                    <p style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 13, color: '#003366', margin: 0, letterSpacing: 0.5 }}>
                        REVISTA "LA COLMENA" — PUCP
                    </p>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>
                        Alianza Estratégica con Revista ACS
                    </p>
                </div>

                {/* CERTIFICADO */}
                <div style={{ position: 'absolute', top: 100, left: 65, right: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', fontSize: 54, color: '#003366', margin: 0, lineHeight: 1, letterSpacing: -1 }}>
                            CERTIFICADO
                        </span>
                        <span style={{ fontFamily: 'Helvetica, sans-serif', fontWeight: 'bold', fontSize: 13, color: '#F4982C', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                            {categorySubtitle}
                        </span>
                    </div>
                    <div style={{ width: 80, height: 4, background: '#FFD700', marginTop: 8 }} />
                    <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: '#475569', margin: '12px 0 0' }}>
                        Otorgado por participación destacada a:
                    </p>
                </div>

                {/* Nombre del Participante */}
                <div style={{ position: 'absolute', top: 215, left: 65, right: 40 }}>
                    <p style={{
                        fontFamily: 'serif',
                        fontWeight: 'bold',
                        fontSize: isPlaceholder ? 24 : 42,
                        color: isPlaceholder ? '#cbd5e1' : '#003366',
                        margin: 0, lineHeight: 1,
                        textTransform: 'uppercase'
                    }}>
                        {displayName}
                    </p>
                </div>

                {/* Cuerpo del texto */}
                <div style={{ position: 'absolute', top: 295, left: 65, right: 65 }}>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                        En reconocimiento a su asistencia y participación en el evento académico e institucional 
                        titulado: <strong style={{ color: '#003366' }}>"{eventTitle || 'NOMBRE DEL EVENTO'}"</strong>, 
                        realizado conjuntamente por las direcciones de ambas revistas.
                    </p>
                    {formattedDate && (
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#64748b', margin: '10px 0 0' }}>
                            Cajamarca / Lima, {formattedDate}
                        </p>
                    )}
                </div>

                {/* Área de Firmas */}
                <div style={{ position: 'absolute', bottom: 50, left: 80, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    {/* Firma 1: Doris (ACS) */}
                    <div style={{ width: 220, textAlign: 'center' }}>
                        <div style={{ position: 'relative', height: 70, marginBottom: -15 }}>
                            <img src="/certificates/firma-directora/firma-doctora-Doris.png" alt="Firma Doris" 
                                style={{ height: 65, margin: '0 auto', objectFit: 'contain' }} />
                        </div>
                        <div style={{ height: 1, background: '#003366', marginBottom: 6 }} />
                        <p style={{ fontSize: 10, fontWeight: 'bold', color: '#003366', margin: 0 }}>Dra. Doris Castañeda Abanto</p>
                        <p style={{ fontSize: 8, color: '#64748b', margin: 0 }}>Directora - Revista ACS</p>
                    </div>

                    {/* Firma 2: Micaela (La Colmena) */}
                    <div style={{ width: 220, textAlign: 'center' }}>
                        <div style={{ position: 'relative', height: 70, marginBottom: -15 }}>
                            <img src="/certificates/logo-la-colmena/firma-micaela.png" alt="Firma Micaela" 
                                style={{ height: 75, margin: '0 auto', objectFit: 'contain' }} />
                        </div>
                        <div style={{ height: 1, background: '#003366', marginBottom: 6 }} />
                        <p style={{ fontSize: 10, fontWeight: 'bold', color: '#003366', margin: 0 }}>Micaela del R. Núñez Cordero</p>
                        <p style={{ fontSize: 8, color: '#64748b', margin: 0 }}>Directora - Revista La Colmena</p>
                    </div>

                    {/* QR Code */}
                    <div style={{ width: 60, height: 60, border: '1px solid #003366', padding: 2, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <>
                                 <div style={{ fontSize: 12, fontWeight: 'bold', color: '#003366' }}>QR</div>
                                 <div style={{ fontSize: 5, color: '#94a3b8', textAlign: 'center', lineHeight: 1 }}>VERIFICACIÓN OFICIAL</div>
                            </>
                        )}
                    </div>

                </div>

                {/* Icono decorativo de La Colmena al fondo */}
                <img src="/certificates/logo-la-colmena/logo-la-colmena-icono.png" alt="" 
                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', height: 350, opacity: 0.03, pointerEvents: 'none' }} />

            </div>
        </div>
    );
}
