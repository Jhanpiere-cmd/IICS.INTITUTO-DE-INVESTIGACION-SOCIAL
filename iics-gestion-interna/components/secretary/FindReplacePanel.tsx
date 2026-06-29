import React, { useState, useEffect } from 'react';
import { X, Search, ArrowUp, ArrowDown, Replace, ReplaceAll, CaseSensitive } from 'lucide-react';

interface FindReplacePanelProps {
    isOpen: boolean;
    onClose: () => void;
    quillInstance: any;
    mode?: 'find' | 'replace';
}

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
    isOpen,
    onClose,
    quillInstance,
    mode: initialMode = 'find'
}) => {
    const [mode, setMode] = useState<'find' | 'replace'>(initialMode);
    const [searchText, setSearchText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [totalMatches, setTotalMatches] = useState(0);
    const [matches, setMatches] = useState<number[]>([]);

    // Buscar coincidencias
    const findMatches = () => {
        if (!quillInstance || !searchText) {
            setMatches([]);
            setTotalMatches(0);
            setCurrentMatch(0);
            return;
        }

        const text = quillInstance.getText();
        const searchRegex = new RegExp(
            searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            caseSensitive ? 'g' : 'gi'
        );

        const foundMatches: number[] = [];
        let match;
        while ((match = searchRegex.exec(text)) !== null) {
            foundMatches.push(match.index);
        }

        setMatches(foundMatches);
        setTotalMatches(foundMatches.length);
        if (foundMatches.length > 0) {
            setCurrentMatch(1);
            highlightMatch(foundMatches[0]);
        }
    };

    // Resaltar coincidencia actual
    const highlightMatch = (index: number) => {
        if (!quillInstance) return;

        // Quitar formato previo
        const length = quillInstance.getLength();
        quillInstance.formatText(0, length, 'background', false);

        // Resaltar todas las coincidencias
        matches.forEach((matchIndex) => {
            quillInstance.formatText(matchIndex, searchText.length, 'background', '#FFEB3B');
        });

        // Resaltar coincidencia actual con color diferente
        quillInstance.formatText(index, searchText.length, 'background', '#FF9800');

        // Scroll a la coincidencia
        quillInstance.setSelection(index, searchText.length);
    };

    // Navegar a coincidencia siguiente
    const nextMatch = () => {
        if (matches.length === 0) return;
        const next = currentMatch >= totalMatches ? 1 : currentMatch + 1;
        setCurrentMatch(next);
        highlightMatch(matches[next - 1]);
    };

    // Navegar a coincidencia anterior
    const previousMatch = () => {
        if (matches.length === 0) return;
        const prev = currentMatch <= 1 ? totalMatches : currentMatch - 1;
        setCurrentMatch(prev);
        highlightMatch(matches[prev - 1]);
    };

    // Reemplazar coincidencia actual
    const replaceCurrentMatch = () => {
        if (!quillInstance || matches.length === 0 || !replaceText) return;

        const matchIndex = matches[currentMatch - 1];
        quillInstance.deleteText(matchIndex, searchText.length);
        quillInstance.insertText(matchIndex, replaceText);

        // Actualizar búsqueda
        setTimeout(findMatches, 100);
    };

    // Reemplazar todas las coincidencias
    const replaceAll = () => {
        if (!quillInstance || matches.length === 0 || !replaceText) return;

        // Reemplazar de atrás hacia adelante para mantener índices
        for (let i = matches.length - 1; i >= 0; i--) {
            const matchIndex = matches[i];
            quillInstance.deleteText(matchIndex, searchText.length);
            quillInstance.insertText(matchIndex, replaceText);
        }

        // Actualizar búsqueda
        setTimeout(findMatches, 100);
    };

    // Effect para buscar cuando cambia el texto
    useEffect(() => {
        if (searchText) {
            const debounce = setTimeout(findMatches, 300);
            return () => clearTimeout(debounce);
        } else {
            // Limpiar resaltados si no hay búsqueda
            if (quillInstance) {
                const length = quillInstance.getLength();
                quillInstance.formatText(0, length, 'background', false);
            }
            setMatches([]);
            setTotalMatches(0);
            setCurrentMatch(0);
        }
    }, [searchText, caseSensitive]);

    // Limpiar al cerrar
    const handleClose = () => {
        if (quillInstance) {
            const length = quillInstance.getLength();
            quillInstance.formatText(0, length, 'background', false);
        }
        setSearchText('');
        setReplaceText('');
        setMatches([]);
        onClose();
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                handleClose();
            } else if (e.key === 'Enter' && !e.shiftKey) {
                nextMatch();
            } else if (e.key === 'Enter' && e.shiftKey) {
                previousMatch();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, matches, currentMatch]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-20 right-6 z-50 w-96 bg-[#1E1E1E] border border - white / 10 rounded - lg shadow - 2xl animate -in slide -in -from - top - 2 duration - 200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('find')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${mode === 'find'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Buscar
                    </button>
                    <button
                        onClick={() => setMode('replace')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${mode === 'replace'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Reemplazar
                    </button>
                </div>
                <button
                    onClick={handleClose}
                    className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg pl-10 pr-24 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {totalMatches > 0 && (
                            <span className="text-xs text-gray-400 mr-1">
                                {currentMatch}/{totalMatches}
                            </span>
                        )}
                        <button
                            onClick={previousMatch}
                            disabled={totalMatches === 0}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                            title="Anterior (Shift+Enter)"
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={nextMatch}
                            disabled={totalMatches === 0}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                            title="Siguiente (Enter)"
                        >
                            <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Replace Input (only in replace mode) */}
                {mode === 'replace' && (
                    <>
                        <div className="relative">
                            <Replace className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                placeholder="Reemplazar por..."
                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Replace Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={replaceCurrentMatch}
                                disabled={totalMatches === 0}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Replace className="w-4 h-4" />
                                Reemplazar
                            </button>
                            <button
                                onClick={replaceAll}
                                disabled={totalMatches === 0}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ReplaceAll className="w-4 h-4" />
                                Todo
                            </button>
                        </div>
                    </>
                )}

                {/* Options */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${caseSensitive
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                            }`}
                        title="Distinguir mayúsculas y minúsculas"
                    >
                        <CaseSensitive className="w-3.5 h-3.5" />
                        Aa
                    </button>
                </div>

                {/* Help text */}
                <div className="text-[10px] text-gray-500 pt-2 border-t border-white/5">
                    <p><kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400">Enter</kbd> siguiente • <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400">Shift+Enter</kbd> anterior • <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400">Esc</kbd> cerrar</p>
                </div>
            </div>
        </div >
    );
};
