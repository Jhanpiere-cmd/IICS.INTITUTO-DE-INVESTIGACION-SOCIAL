import { MouseEvent } from 'react';
import { Facebook, Twitter, Linkedin, Youtube, Mail, MapPin, Phone } from 'lucide-react';

interface FooterLink {
  label: string;
  action: 'scroll' | 'modal';
  target: string;
}

interface FooterProps {
  onOpenNosotros?: () => void;
  onOpenPortal?: () => void;
  onOpenPublicaciones?: () => void;
  onOpenAcademia?: () => void;
  onOpenDocumentales?: () => void;
}

export default function Footer({
  onOpenNosotros,
  onOpenPortal,
  onOpenPublicaciones,
  onOpenAcademia,
  onOpenDocumentales,
}: FooterProps) {
  const enlaces: FooterLink[] = [
    { label: 'Inicio', action: 'scroll', target: '#inicio' },
    { label: 'Nosotros', action: 'modal', target: 'nosotros' },
    { label: 'Investigación', action: 'scroll', target: '#lineas-investigacion' },
    { label: 'Observatorio', action: 'scroll', target: '#observatorio' },
    { label: 'Formación', action: 'scroll', target: '#modelo-institucional' },
    { label: 'Publicaciones', action: 'modal', target: 'publicaciones' },
  ];

  const recursos: FooterLink[] = [
    { label: 'Portal de Datos', action: 'modal', target: 'portal' },
    { label: 'Repositorio', action: 'modal', target: 'publicaciones' },
    { label: 'Documentales', action: 'modal', target: 'documentales' },
    { label: 'Convocatorias AFI', action: 'modal', target: 'academia' },
    { label: 'Observatorio', action: 'scroll', target: '#observatorio' },
    { label: 'Contacto', action: 'scroll', target: '#footer' },
  ];

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, link: FooterLink) => {
    e.preventDefault();

    if (link.action === 'scroll') {
      const element = document.querySelector(link.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    switch (link.target) {
      case 'nosotros':
        onOpenNosotros?.();
        break;
      case 'portal':
        onOpenPortal?.();
        break;
      case 'publicaciones':
        onOpenPublicaciones?.();
        break;
      case 'academia':
        onOpenAcademia?.();
        break;
      case 'documentales':
        onOpenDocumentales?.();
        break;
    }
  };

  return (
    <footer id="footer" className="bg-transparent border-t border-gray-900 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-gray-800/60">
          
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center">
                <img src="/logo-iics-siglas.png" alt="Logo IICS" className="h-14 w-14 object-contain z-10" />
              </div>
            </div>
            
            <p className="text-sm text-gray-250 max-w-xs leading-relaxed">
              Instituto de Investigación Científica Social (IICS). Centro de investigación privado, independiente y tecnológico de sociología de precisión en el norte peruano.
            </p>
            <p className="text-[11px] text-gray-400 font-mono">
              CORPORACIÓN PRIVADA DE INVESTIGACIÓN | CAJAMARCA, PERÚ
            </p>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <h4 className="text-sm font-black text-white uppercase tracking-widest font-sans">
              Enlaces
            </h4>
            <ul className="space-y-2">
              {enlaces.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.action === 'scroll' ? link.target : '#'}
                    onClick={(e) => handleLinkClick(e, link)}
                    className="text-sm text-gray-250 hover:text-cyan-400 transition-colors font-medium cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <h4 className="text-sm font-black text-white uppercase tracking-widest font-sans">
              Recursos
            </h4>
            <ul className="space-y-2">
              {recursos.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.action === 'scroll' ? link.target : '#'}
                    onClick={(e) => handleLinkClick(e, link)}
                    className="text-sm text-gray-250 hover:text-cyan-400 transition-colors font-medium cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 flex flex-col gap-4">
            <h4 className="text-sm font-black text-white uppercase tracking-widest font-sans">
              Contacto
            </h4>
            
            <ul className="space-y-3 font-sans">
              <li className="flex items-start gap-2.5 text-sm text-gray-250">
                <MapPin className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Av. Atahualpa 1050, Cajamarca, Perú</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-cyan-300 font-semibold">
                <Mail className="h-4.5 w-4.5 text-[#0099ff] shrink-0" />
                <a href="mailto:contacto@iics.org" className="hover:underline">contacto@iics.org</a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-250">
                <Phone className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                <span>+51 76 365000</span>
              </li>
            </ul>

            <div className="flex items-center gap-3 pt-2 select-none">
              <a href="mailto:contacto@iics.org" aria-label="Contacto IICS por correo" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="mailto:contacto@iics.org" aria-label="Contacto IICS por correo" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="mailto:contacto@iics.org" aria-label="Contacto IICS por correo" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="mailto:contacto@iics.org" aria-label="Contacto IICS por correo" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-gray-400 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
            <span>
              © 2026 IICS - Corporación Privada e Independiente. Todos los derechos reservados.
            </span>
            <span className="hidden sm:inline text-gray-700">|</span>
            <span className="flex items-center gap-1.5 mt-1 sm:mt-0">
              Desarrollado y mantenido por{" "}
              <a 
                href="https://zolexy.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-cyan-400 hover:text-[#0099ff] font-bold hover:underline"
              >
                Zolexy Solutions
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:contacto@iics.org?subject=T%C3%A9rminos%20de%20servicio" className="hover:text-gray-300 transition-colors">Términos de servicio</a>
            <span>•</span>
            <a href="mailto:contacto@iics.org?subject=Pol%C3%ADticas%20de%20Privacidad" className="hover:text-gray-300 transition-colors">Políticas de Privacidad</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
