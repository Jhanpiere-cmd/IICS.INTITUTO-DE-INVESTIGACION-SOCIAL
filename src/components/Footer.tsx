import { MouseEvent } from 'react';
import { Facebook, Twitter, Linkedin, Youtube, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onOpenNosotros?: () => void;
}

export default function Footer({ onOpenNosotros }: FooterProps) {
  const enlaces = [
    { label: 'Inicio', path: '#inicio' },
    { label: 'Nosotros', path: '#sobre-el-iics' },
    { label: 'Investigación', path: '#lineas-investigacion' },
    { label: 'Observatorio', path: '#observatorio' },
    { label: 'Formación', path: '#valores' },
    { label: 'Publicaciones', path: '#publicaciones' }
  ];

  const recursos = [
    { label: 'Portal de Datos', path: '#' },
    { label: 'Repositorio', path: '#' },
    { label: 'Documentos', path: '#' },
    { label: 'Convocatorias', path: '#' },
    { label: 'Noticias', path: '#' },
    { label: 'Eventos', path: '#' }
  ];

  const handleSmoothScroll = (e: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (path === '#sobre-el-iics' && onOpenNosotros) {
      e.preventDefault();
      onOpenNosotros();
      return;
    }
    if (path.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <footer id="footer" className="bg-transparent border-t border-gray-900 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-gray-800/60">
          
          {/* Logo brand stack column */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <img src="/logo-iics.png" alt="Logo IICS" className="h-13 w-13 object-contain z-10" />
              </div>
            </div>
            
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Instituto de Investigación Científica Social (IICS). Centro de investigación privado, independiente y tecnológico de sociología de precisión en el norte peruano.
            </p>
            <p className="text-[10px] text-gray-500 font-mono">
              CORPORACIÓN PRIVADA DE INVESTIGACIÓN | CAJAMARCA, PERÚ
            </p>
          </div>

          {/* Enlaces Column */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">
              Enlaces
            </h4>
            <ul className="space-y-2">
              {enlaces.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.path}
                    onClick={(e) => handleSmoothScroll(e, link.path)}
                    className="text-xs md:text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Recursos Column */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">
              Recursos
            </h4>
            <ul className="space-y-2">
              {recursos.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.path}
                    className="text-xs md:text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto Column */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">
              Contacto
            </h4>
            
            <ul className="space-y-3 font-sans">
              <li className="flex items-start gap-2.5 text-xs md:text-sm text-gray-400">
                <MapPin className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Av. Atahualpa 1050, Cajamarca, Perú</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs md:text-sm text-[#0099ff] font-medium">
                <Mail className="h-4.5 w-4.5 text-[#0099ff] shrink-0" />
                <a href="mailto:contacto@iics.org" className="hover:underline">contacto@iics.org</a>
              </li>
              <li className="flex items-center gap-2.5 text-xs md:text-sm text-gray-400">
                <Phone className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
                <span>+51 76 365000</span>
              </li>
            </ul>

            {/* Social handles circle containers */}
            <div className="flex items-center gap-3 pt-2 select-none">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-none bg-gray-950 border border-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/25 transition-all">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Lower Banner Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[11px] text-gray-500 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
            <span>
              © 2026 IICS - Corporación Privada e Independiente. Todos los derechos reservados.
            </span>
            <span className="hidden sm:inline text-gray-800">|</span>
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
            <a href="#" className="hover:text-gray-300 transition-colors">Términos de servicio</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-300 transition-colors">Políticas de Privacidad</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
