import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] rounded-none shadow-2xl w-full max-w-sm border border-exec-border overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-none ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight uppercase">
                            {title}
                        </h3>
                    </div>
                    
                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white border border-exec-border rounded-none text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2 rounded-none text-[11px] font-black uppercase tracking-widest shadow-lg transition-all ${
                                isDestructive 
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ConfirmContextType {
    confirm: (titleOrOptions: any, message?: string, options?: { confirmText?: string; cancelText?: string; isDestructive?: boolean }) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        isDestructive?: boolean;
        resolve?: (value: boolean) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });

    const confirm = useCallback((titleOrOptions: string | any, message?: string, options?: { confirmText?: string; cancelText?: string; isDestructive?: boolean }) => {
        return new Promise<boolean>((resolve) => {
            if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
                // Compatibility mode for legacy object-based calls
                setState({
                    isOpen: true,
                    title: titleOrOptions.title || 'Confirmar',
                    message: titleOrOptions.message || '¿Estás seguro?',
                    confirmText: titleOrOptions.confirmLabel || titleOrOptions.confirmText,
                    cancelText: titleOrOptions.cancelLabel || titleOrOptions.cancelText,
                    isDestructive: titleOrOptions.isDestructive,
                    resolve,
                });
            } else {
                // Standard positional mode
                setState({
                    isOpen: true,
                    title: titleOrOptions || '',
                    message: message || '',
                    confirmText: options?.confirmText,
                    cancelText: options?.cancelText,
                    isDestructive: options?.isDestructive,
                    resolve,
                });
            }
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (state.resolve) state.resolve(true);
        setState(prev => ({ ...prev, isOpen: false }));
    }, [state]);

    const handleCancel = useCallback(() => {
        if (state.resolve) state.resolve(false);
        setState(prev => ({ ...prev, isOpen: false }));
    }, [state]);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <ConfirmModal
                isOpen={state.isOpen}
                title={state.title}
                message={state.message}
                confirmText={state.confirmText}
                cancelText={state.cancelText}
                isDestructive={state.isDestructive}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
