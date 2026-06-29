import React from 'react';
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';

interface AutoSaveIndicatorProps {
    status: 'idle' | 'saving' | 'saved' | 'error';
    lastSaved?: Date | null;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ status, lastSaved }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'saving':
                return {
                    icon: Loader2,
                    text: 'Guardando...',
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    animate: 'animate-spin'
                };
            case 'saved':
                return {
                    icon: Check,
                    text: 'Guardado',
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/10',
                    animate: ''
                };
            case 'error':
                return {
                    icon: AlertCircle,
                    text: 'Error al guardar',
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    animate: ''
                };
            default:
                return {
                    icon: Cloud,
                    text: 'Sin cambios',
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-500/10',
                    animate: ''
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    const getRelativeTime = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 10) return 'justo ahora';
        if (seconds < 60) return `hace ${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `hace ${hours}h`;
    };

    return (
        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} border border-white/5 transition-all duration-300`}
            title={lastSaved ? `Último guardado: ${lastSaved.toLocaleString('es-ES')}` : undefined}
        >
            <Icon className={`w-4 h-4 ${config.color} ${config.animate}`} />
            <div className="flex flex-col">
                <span className={`text-xs font-medium ${config.color}`}>
                    {config.text}
                </span>
                {lastSaved && status === 'saved' && (
                    <span className="text-[10px] text-gray-500">
                        {getRelativeTime(lastSaved)}
                    </span>
                )}
            </div>
        </div>
    );
};
