import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toastOrMessage: any, typeOrTitle?: any, message?: string) => void;
    toast: (type: ToastType, message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toastOrMessage: Omit<Toast, 'id'> | string, typeOrTitle?: ToastType | string, message?: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        
        let finalToast: Omit<Toast, 'id'>;

        if (typeof toastOrMessage === 'string') {
            // Positional compatibility mode: showToast(message, type) or showToast(title, type, message)
            if (message) {
                finalToast = {
                    title: toastOrMessage,
                    type: (typeOrTitle as ToastType) || 'info',
                    message: message
                };
            } else {
                finalToast = {
                    title: (typeOrTitle as string)?.toUpperCase() || 'INFO',
                    type: (typeOrTitle as ToastType) || 'info',
                    message: toastOrMessage
                };
            }
        } else {
            finalToast = toastOrMessage;
        }

        setToasts((prev) => [...prev, { ...finalToast, id, duration: finalToast.duration ?? 5000 }]);

        if ((finalToast.duration ?? 5000) > 0) {
            setTimeout(() => {
                removeToast(id);
            }, finalToast.duration ?? 5000);
        }
    }, []);

    const toast = useCallback((type: ToastType, message: string, title?: string) => {
        const defaultTitles = {
            success: 'ÉXITO',
            error: 'ERROR',
            info: 'INFO',
            warning: 'ADVERTENCIA'
        };
        showToast({
            type,
            title: title || defaultTitles[type],
            message
        });
    }, [showToast]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100
                            flex items-start gap-3 p-4 rounded-none border shadow-2xl backdrop-blur-xl
                            ${toast.type === 'success' ? 'bg-[#0A0A0A]/90 border-green-500/30' : ''}
                            ${toast.type === 'error' ? 'bg-[#0A0A0A]/90 border-red-500/30' : ''}
                            ${toast.type === 'warning' ? 'bg-[#0A0A0A]/90 border-yellow-500/30' : ''}
                            ${toast.type === 'info' ? 'bg-[#0A0A0A]/90 border-blue-500/30' : ''}
                            animate-in slide-in-from-right-full fade-in
                        `}
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0 pt-0.5">
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <h4 className={`text-[10px] font-bold uppercase tracking-[0.2em]
                                ${toast.type === 'success' ? 'text-green-400' : ''}
                                ${toast.type === 'error' ? 'text-red-400' : ''}
                                ${toast.type === 'warning' ? 'text-yellow-400' : ''}
                                ${toast.type === 'info' ? 'text-blue-400' : ''}
                            `}>
                                {toast.title}
                            </h4>
                            <p className="text-[12px] text-gray-400 mt-1 leading-relaxed font-light">
                                {toast.message}
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
