import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: '/admin', icon: 'home', label: 'Inicio' },
        { path: '/admin/tasks', icon: 'task_alt', label: 'Tareas' },
        { path: '/admin/calendar', icon: 'calendar_month', label: 'Calendario' },
        { path: '/admin/meetings', icon: 'groups', label: 'Reuniones' },
        { path: '/admin/events', icon: 'campaign', label: 'Eventos' },
        { path: '/admin/communications', icon: 'mail', label: 'Correo' },
        { path: '/admin/secretaria', icon: 'folder_managed', label: 'Gestión Documental' },
        { path: '/admin/news', icon: 'article', label: 'Noticias' },
        { path: '/admin/media', icon: 'movie_edit', label: 'Gestión Audiovisual' },
        { path: '/admin/whatsapp', icon: 'chat', label: 'WhatsApp' },
        { path: '/admin/proposals', icon: 'lightbulb', label: 'Propuestas' },
        { path: '/admin/chat', icon: 'smart_toy', label: 'Asistente IA' },
        { path: '/admin/surveys', icon: 'poll', label: 'Encuestas' },
        { path: '/admin/reports', icon: 'bar_chart', label: 'Reportes' },
        { path: '/admin/benefits', icon: 'card_giftcard', label: 'Beneficios' },
        { path: '/admin/training', icon: 'school', label: 'Capacitaciones' },
        { path: '/admin/certificates', icon: 'license', label: 'Certificados' },
        { path: '/admin/birthdays', icon: 'cake', label: 'Cumpleaños' },
        { path: '/admin/users', icon: 'group', label: 'Usuarios' },
        { path: '/admin/alliances', icon: 'handshake', label: 'Alianzas' },
        { path: '/admin/finance', icon: 'account_balance_wallet', label: 'Gestión Financiera' },
        { path: '/admin/whiteboard', icon: 'edit_square', label: 'Pizarra Neural' },
        { path: '/admin/radar', icon: 'radar', label: 'Radar ACS' },
    ];

    return (
        <aside className={`
            fixed md:relative inset-y-0 left-0 bg-[#000000] text-white flex-shrink-0 flex flex-col justify-between border-r border-exec-border z-50 transition-all duration-300 pt-safe pb-safe
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isCollapsed ? 'w-20 overflow-x-hidden' : 'w-64'}
            md:flex
        `}>
            {/* Collapse/Expand Toggle Button (Desktop only) */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3 top-8 w-6 h-6 bg-[#111] text-gray-400 rounded-full items-center justify-center z-50 shadow-md hover:text-white hover:bg-[#222] transition-colors border border-exec-border"
                title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
                {/* Logo - Fixed at top */}
                <div className={`h-16 flex-shrink-0 flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-6'} border-b border-exec-border bg-[#000000] transition-all duration-300 relative`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
                        <img
                            src="/logo-iics-siglas.png"
                            alt="SDI-IICS Logo"
                            className={`w-auto object-contain transition-all duration-300 ${isCollapsed ? 'h-7 mx-auto' : 'h-10'}`}
                        />
                    </div>
                    {/* Botón de cierre para móviles */}
                    <button
                        onClick={onClose}
                        className="md:hidden absolute right-4 p-2 text-gray-400 hover:text-white transition-colors"
                        title="Cerrar menú"
                    >
                        <span className="material-symbols-outlined notranslate text-2xl" translate="no">close</span>
                    </button>
                </div>

                {/* Navigation - Scrollable area */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : undefined}
                            className={`flex items-center py-2.5 text-sm font-medium rounded-none transition-all ${isActive(item.path)
                                ? 'bg-[#111] text-white border border-exec-border'
                                : 'text-gray-400 hover:text-white hover:bg-[#111]'
                                } ${isCollapsed ? 'md:justify-center justify-start md:px-0 px-3 w-10 mx-auto aspect-square' : 'justify-start px-3 gap-3'}`}
                        >
                            <span className="material-symbols-outlined notranslate text-[20px] shrink-0" translate="no">{item.icon}</span>
                            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'md:hidden block' : 'block'}`}>
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className={`border-t border-exec-border bg-[#000000] flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'md:p-2 p-4 md:flex md:flex-col md:items-center block' : 'p-4'}`}>
                <Link
                    to="/admin/settings"
                    title={isCollapsed ? 'Configuración' : undefined}
                    className={`flex items-center py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#111] rounded-none transition-all ${isCollapsed ? 'md:justify-center justify-start md:px-0 px-3 w-10 mx-auto aspect-square' : 'px-3 justify-start gap-3'}`}
                >
                    <span className="material-symbols-outlined notranslate text-[20px] shrink-0" translate="no">settings</span>
                    <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'md:hidden block' : 'block'}`}>Configuración</span>
                </Link>

                <button
                    onClick={async () => {
                        await signOut();
                        navigate('/admin/login');
                    }}
                    title={isCollapsed ? 'Cerrar Sesión' : undefined}
                    className={`mt-1 flex items-center py-2.5 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-[#111] rounded-none transition-all text-left ${isCollapsed ? 'md:justify-center justify-start md:px-0 px-3 w-10 mx-auto aspect-square' : 'px-3 justify-start w-full gap-3'}`}
                >
                    <span className="material-symbols-outlined notranslate text-[20px] shrink-0" translate="no">logout</span>
                    <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'md:hidden block' : 'block'}`}>Cerrar Sesión</span>
                </button>

                {/* User Profile */}
                <div className={`mt-4 pt-4 border-t border-exec-border flex items-center ${isCollapsed ? 'md:justify-center justify-start md:px-0 px-1' : 'px-2 gap-3'} w-full`}>
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-exec-border flex-shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10 flex-shrink-0">
                            {user?.fullName?.charAt(0) || 'U'}
                        </div>
                    )}
                    {!isCollapsed && (
                        <div className="overflow-hidden transition-all duration-300">
                            <p className="text-xs font-medium text-white truncate">
                                {user?.fullName || 'Usuario'}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                                {user?.role || 'Usuario'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
