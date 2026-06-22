import { useState } from 'react';
import { Database, Menu, X, Lock, Unlock, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  onOpenPortal: () => void;
  onNavigate: (section: string) => void;
  activeSection: string;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Header({ onOpenPortal, onNavigate, activeSection, isLoggedIn, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Inicio', id: 'inicio', path: '#inicio' },
    { label: 'Nosotros', id: 'nosotros', path: '#sobre-el-iics' },
    { label: 'Investigación', id: 'investigacion', path: '#lineas-investigacion' },
    { label: 'Observatorio', id: 'observatorio', path: '#observatorio' },
    { label: 'Formación', id: 'valores', path: '#modelo-institucional' },
    { label: 'Publicaciones', id: 'publicaciones', path: '#publicaciones' },
    { label: 'Contacto', id: 'contacto', path: '#footer' },
  ];

  const handleNavClick = (id: string, path: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
    if (id !== 'nosotros' && path.startsWith('#')) {
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-gray-800/60 bg-black/95 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 sm:py-1.5 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('inicio', '#inicio')}>
          <div className="relative flex h-9 w-9 items-center justify-center">
            <img src="/logo-iics.png" alt="Logo IICS" className="h-8.5 w-8.5 object-contain z-10" />
            <div className="absolute inset-0 rounded-full bg-cyan-400/5 blur-sm"></div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                IICS
              </span>
              <span className="hidden h-3.5 w-px bg-gray-700 sm:inline-block"></span>
              <span id="logo-tagline" className="hidden text-[9px] font-medium uppercase tracking-widest text-[#0099ff] sm:inline-block">
                Investigación
              </span>
            </div>
            <span className="text-[8.5px] leading-3 text-gray-400 tracking-tight font-sans">
              Instituto de Investigación Científica Social <b className="text-cyan-400 font-semibold text-[8.5px]">Privado e Independiente</b>
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id, item.path)}
                className={`relative px-3 py-1.5 text-xs font-medium transition-colors hover:text-cyan-300 ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavLine"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-cyan-400"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Button & Mobile Trigger */}
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 border border-emerald-500/20 bg-emerald-950/20 font-mono text-[9px] text-emerald-400 font-bold uppercase tracking-wider select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Analista
            </div>
          )}

          <button
            id="btn-portal-datos"
            onClick={onOpenPortal}
            className={`relative hidden sm:flex items-center gap-2 rounded-none px-3.5 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              isLoggedIn 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,153,255,0.25)] hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(0,153,255,0.5)]'
            }`}
          >
            {isLoggedIn ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isLoggedIn ? 'Portal (Abierto)' : 'Portal (Cerrado)'}
          </button>

          {isLoggedIn && (
            <button
              id="btn-header-logout"
              onClick={onLogout}
              title="Cerrar sesión de Analista"
              className="hidden sm:flex items-center justify-center p-1.5 rounded-none bg-red-950/10 border border-red-950/30 text-red-500 hover:bg-red-950/30 hover:text-red-400 hover:border-red-500/35 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            id="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden items-center justify-center p-2 rounded-none bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="lg:hidden border-t border-gray-800 bg-black/95 backdrop-blur-lg"
        >
          <div className="px-4 py-3 space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`mobile-nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id, item.path)}
                className="block w-full text-left px-3 py-2 text-base font-medium rounded-none text-gray-300 hover:bg-gray-900 hover:text-white transition-colors"
              >
                {item.label}
              </button>
            ))}
             <div className="pt-4 pb-2 border-t border-gray-800 space-y-2">
              {isLoggedIn && (
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 font-mono text-xs select-none">
                  <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Analista Conectado
                  </span>
                  <button 
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-[10px] font-bold text-red-500 hover:text-red-450 uppercase tracking-widest underline decoration-dotted underline-offset-2"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
              <button
                id="btn-portal-datos-mobile"
                onClick={() => {
                  onOpenPortal();
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-none py-3 text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(0,153,255,0.3)] ${
                  isLoggedIn 
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
              >
                {isLoggedIn ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {isLoggedIn ? 'Portal (Abierto)' : 'Portal (Cerrado)'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
}
