import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { loadTheme, saveTheme, getNextTheme } from '../../utils/theme';

interface HeaderProps {
    onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Generate breadcrumb from current path
    const generateBreadcrumb = () => {
        const pathSegments = location.pathname.split('/').filter(Boolean);

        if (pathSegments.length === 0) {
            return { main: 'Inicio General', sub: 'Resumen Ejecutivo' };
        }

        const pathMap: { [key: string]: string } = {
            'tasks': 'Proyectos',
            'events': 'Comunicaciones',
            'analytics': 'Analítica',
            'resources': 'Recursos',
            'settings': 'Configuración',
            'finance': 'Finanzas',
            'meetings': 'Reuniones',
            'news': 'Noticias',
            'proposals': 'Propuestas',
            'chat': 'Asistente AI',
            'training': 'Capacitaciones',
            'radar': 'Radar Estratégico',
        };

        const main = pathMap[pathSegments[0]] || pathSegments[0];
        const sub = pathSegments[1] ? pathSegments[1].charAt(0).toUpperCase() + pathSegments[1].slice(1) : '';

        return { main, sub };
    };

    const { main, sub } = generateBreadcrumb();

    return (
        <header className="h-16 bg-[#000000] border-b border-exec-border flex items-center justify-between px-8 flex-shrink-0">
            {/* Breadcrumb & Mobile Toggle */}
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={onMenuToggle}
                    className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden transition-colors"
                    aria-label="Menú"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Mobile Identity - Hidden on Desktop */}
                <div className="flex md:hidden items-center gap-2">
                    <div className="bg-exec-blue text-black font-black px-2 py-0.5 rounded text-[11px]">ACS</div>
                    <span className="text-[10px] font-bold tracking-widest text-gray-400">SGR-ACS</span>
                </div>

                {/* Desktop Breadcrumb - Hidden on Mobile */}
                <div className="hidden md:flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 overflow-hidden">
                    <span className="text-white font-medium whitespace-nowrap">{main}</span>
                    {sub && (
                        <>
                            <span className="text-gray-600">/</span>
                            <span className="truncate">{sub}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right Side: Status + Notifications */}
            <div className="flex items-center gap-3 md:gap-6">
                {/* System Status Indicator with Glow */}
                <div className="flex items-center gap-2">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-exec-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-[9px] md:text-xs font-medium text-gray-400 uppercase tracking-wide">
                        LIVE DATA
                    </span>
                </div>

                {/* Divider - Desktop Only */}
                <div className="hidden md:block h-4 w-px bg-exec-border"></div>

                {/* Switch to Observatorio */}
                <button
                    onClick={() => {
                        window.location.href = '/';
                    }}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1 border border-cyan-800/35 hover:border-cyan-500 bg-cyan-950/20 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all duration-300 cursor-pointer"
                    title="Vista de Observatorio (Modo Público)"
                >
                    <span className="material-symbols-outlined notranslate text-[18px]" translate="no">visibility</span>
                    <span>Observatorio</span>
                </button>

                {/* Theme Toggle - Desktop Only */}
                <button
                    onClick={() => {
                        const currentTheme = loadTheme();
                        const nextTheme = getNextTheme(currentTheme);
                        saveTheme(nextTheme);
                    }}
                    className="hidden md:block text-gray-400 hover:text-white transition-colors"
                    title="Cambiar Tema"
                >
                    <span className="material-symbols-outlined notranslate text-[20px]" translate="no">contrast</span>
                </button>

                {/* Notifications Dropdown */}
                <NotificationDropdown />

                {/* User Avatar - Mobile Only */}
                <div 
                    className="md:hidden w-7 h-7 rounded-full overflow-hidden border border-white/10 active:scale-90 transition-transform cursor-pointer"
                    onClick={() => navigate('/admin/profile')}
                >
                    {user?.avatarUrl ? (
                        <img 
                            src={user.avatarUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-exec-blue/20 flex items-center justify-center text-[10px] text-exec-blue font-bold">
                            {user?.fullName?.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
