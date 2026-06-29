import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icons } from '../icons';

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        {
            label: 'Inicio',
            icon: Icons.Home,
            path: '/',
            isActive: location.pathname === '/'
        },
        {
            label: 'Tareas',
            icon: Icons.Tasks,
            path: '/tasks',
            isActive: location.pathname === '/tasks'
        },
        {
            label: 'Calendario',
            icon: Icons.Calendar,
            path: '/calendar',
            isActive: location.pathname === '/calendar'
        },
        {
            label: 'Más',
            icon: Icons.MoreVertical,
            path: '/news', // Sujeto a cambios, el Dashboard lo mandaba a /news
            isActive: location.pathname !== '/' && location.pathname !== '/tasks' && location.pathname !== '/calendar'
        }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex justify-between items-center z-50 md:hidden">
            {navItems.map((item) => (
                <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-1 transition-colors ${
                        item.isActive ? 'text-exec-blue' : 'text-gray-500 active:text-exec-blue'
                    }`}
                >
                    <item.icon className="h-6 w-6" />
                    <span className={`text-[10px] ${item.isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                    </span>
                </button>
            ))}
        </nav>
    );
};
