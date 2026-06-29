// @ts-nocheck
// DocumentEditor.tsx - Versión mejorada con modo plantilla y diseño Word claro
// FIX: Se reemplazó instanciación manual de Quill por componente ReactQuill (elimina crash pantalla negra)
import { generateContent, generateDocumentDraft, AIConfig, DEFAULT_AI_CONFIG } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import React, { useState, useRef, useEffect, useCallback, Component } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { supabase } from '../../lib/supabase';
import {
    X, FileText, Save, Search, Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
    Undo, Redo, Download, Maximize2, Minimize2, Sparkles,
    FileType, Type, Highlighter, ChevronDown, ArrowLeft,
    Minus, Plus, Trash2, Upload, Check, Wand2, PenTool, FileDown,
    Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { FindReplacePanel } from './FindReplacePanel';
import { TemplateGallery } from './TemplateGallery';

// Lazy loading de ReactQuill para evitar crash durante hidratación inicial
const ReactQuillLazy = React.lazy(() => import('react-quill-new'));

// Registro de fuentes y tamaños en Quill (Global) - con try/catch para producción
import ReactQuillForRegistration from 'react-quill-new';
try {
    if (typeof window !== 'undefined') {
        const Quill = (ReactQuillForRegistration as any).Quill;
        if (Quill) {
            const Font = Quill.import('formats/font');
            Font.whitelist = ['times-new-roman', 'arial', 'georgia', 'courier-new', 'verdana'];
            Quill.register(Font, true);

            const Size = Quill.import('formats/size');
            Size.whitelist = ['small', 'large', 'huge'];
            Quill.register(Size, true);
        }
    }
} catch (e) {
    console.warn('[DocumentEditor] Quill registration failed (non-critical):', e);
}

// Wrapper tipado para ReactQuill que acepta ref correctamente
const QuillEditor = (props: any) => <ReactQuillLazy {...props} />;

// ErrorBoundary para evitar que un crash de Quill derrumbe toda la app
interface EBProps { children: React.ReactNode; }
interface EBState { hasError: boolean; message: string; }
class QuillErrorBoundary extends React.Component<EBProps, EBState> {
    public state: EBState = { hasError: false, message: '' };
    static getDerivedStateFromError(error: Error): EBState {
        return { hasError: true, message: error.message };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-red-400 p-8">
                    <span className="text-4xl">⚠️</span>
                    <p className="font-bold text-sm uppercase">Error en el editor</p>
                    <p className="text-xs text-gray-500 text-center">{this.state.message}</p>
                    <button onClick={() => this.setState({ hasError: false, message: '' })} className="px-4 py-2 bg-blue-600 text-white rounded text-xs">
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

interface DocumentEditorProps {
    onClose: () => void;
    folderName: string;
}

interface Signatory {
    id: string;
    name: string;
    role: string;
    signatureUrl?: string;
}

// Helper to fetch context
const fetchSystemContext = async (currentFolderFiles: any[]) => {
    const [users, events] = await Promise.all([
        supabase.from('profiles').select('full_name, role, email').limit(20),
        supabase.from('calendar_events').select('title, start_time, location').gte('start_time', new Date().toISOString()).limit(5)
    ]);

    return {
        users: users.data || [],
        events: events.data || [],
        files: currentFolderFiles
    };
};

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ onClose, folderName }) => {
    // ===== CONFIGURACIÓN DE ORGANIZACIÓN =====
    const [orgName, setOrgName] = useState('ACS');
    const [orgFullName, setOrgFullName] = useState('Alternativas en Ciencias Sociales');
    const [locality, setLocality] = useState('Cajamarca');

    // ===== TEMA: Moderno o Stitch =====
    const [theme, setTheme] = useState<'moderno' | 'stitch'>('stitch');
    const [pageCount, setPageCount] = useState(1);

    // Paletas de colores dinámicas
    const themes = {
        moderno: {
            topBar: 'bg-[#2B579A]',
            ribbon: 'bg-[#2B579A]',
            toolbar: 'bg-[#F7F7F7]',
            editorBg: 'bg-[#E5E5E5]',
            text: 'text-white',
            toolbarText: 'text-gray-700',
            border: 'border-gray-300',
            buttonHover: 'hover:bg-gray-200',
            input: 'border-gray-300 bg-white text-gray-900',
            card: 'bg-white border-gray-200 shadow-sm',
            accent: 'text-blue-600',
            accentBg: 'bg-blue-50 border-blue-200',
            accentText: 'text-blue-700',
            label: 'text-gray-600',
            header: 'text-gray-700',
            btnPrimary: 'bg-[#2B579A] hover:bg-[#1E4378] text-white',
            btnSecondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
            btnAI: 'bg-purple-600 hover:bg-purple-500 text-white',
            scrollbar: '',
        },
        stitch: {
            topBar: 'bg-black border-b border-[#262626]',
            ribbon: 'bg-black border-b border-[#262626]',
            toolbar: 'bg-[#0A0A0A] border-b border-[#262626]',
            editorBg: 'bg-black',
            text: 'text-white',
            toolbarText: 'text-gray-300',
            border: 'border-[#262626]',
            buttonHover: 'hover:bg-[#1A1A1A]',
            input: 'border-[#262626] bg-[#171717] text-white',
            card: 'bg-[#0A0A0A] border-[#262626] shadow-card',
            accent: 'text-exec-blue',
            accentBg: 'bg-[#111111] border-[#262626]',
            accentText: 'text-exec-blue',
            label: 'text-gray-500',
            header: 'text-white',
            btnPrimary: 'bg-white text-black hover:bg-gray-200',
            btnSecondary: 'bg-black text-gray-300 border-[#262626] hover:bg-[#1A1A1A] hover:text-white',
            btnAI: 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg shadow-purple-500/30 text-white',
            scrollbar: 'stitch-scrollbar',
        }
    };
    const t = themes[theme];

    // Helper component for theme-aware icons
    const StitchIcon = ({ name, lucideIndex: LucideIcon, className = "w-4 h-4" }: { name: string, lucideIndex?: any, className?: string }) => {
        if (theme === 'stitch') {
            return <span className={`material-symbols-outlined ${className.replace(/w-\d+|h-\d+/g, '').trim()}`} style={{ fontSize: className.includes('w-5') ? '20px' : className.includes('w-6') ? '24px' : '18px' }}>{name}</span>;
        }
        return LucideIcon ? <LucideIcon className={className} /> : <span className="w-4 h-4" />;
    };

    // Core Editor State
    const [mode, setMode] = useState<'template' | 'free'>('template'); // Modo selección
    const [isFullScreen, setIsFullScreen] = useState(false); // NO full screen por defecto
    const [activeRibbonTab, setActiveRibbonTab] = useState('inicio');
    const quillRef = useRef<any>(null); // Ref al componente ReactQuill
    const quillInstance = useRef<any>(null); // Se mantiene para compatibilidad con FindReplace

    // Template Mode State
    const [docType, setDocType] = useState('OFICIO');
    const [docNumber, setDocNumber] = useState(1);
    const [recipient, setRecipient] = useState('');
    const [body, setBody] = useState('');
    const [showLogos, setShowLogos] = useState(true);
    const [logoLeft, setLogoLeft] = useState<string | null>(null);
    const [logoRight, setLogoRight] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [signatories, setSignatories] = useState<Signatory[]>([
        { id: '1', name: '', role: '', signatureUrl: '' }
    ]);

    // Free Editor State
    const [freeText, setFreeText] = useState('');

    // Document State
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState('Documento sin título');

    // Auto-save State
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // UI State
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find');
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);

    // AI Assistant State
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedDraft, setGeneratedDraft] = useState<{ docType?: string, recipient?: string, body: string } | null>(null);
    const [zoom, setZoom] = useState(1); // Zoom state
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

    // Formatos activos para iluminación de botones
    const [activeFormats, setActiveFormats] = useState<any>({});

    // Sincronizar formatos cada vez que el cursor se mueva
    useEffect(() => {
        if (!quillInstance.current) return;
        const editor = quillInstance.current;

        const updateFormats = () => {
            const formats = editor.getFormat();
            setActiveFormats(formats);
        };

        editor.on('selection-change', updateFormats);
        editor.on('text-change', updateFormats);

        return () => {
            editor.off('selection-change', updateFormats);
            editor.off('text-change', updateFormats);
        };
    }, [refresh]); // Usamos refresh como trigger inicial

    // Callback ref para ReactQuill - guarda la instancia Quill para FindReplace + toolbar
    const handleQuillRef = (el: any) => {
        quillRef.current = el;
        if (el) {
            // Usar setTimeout para esperar que Quill esté completamente inicializado
            setTimeout(() => {
                try {
                    if (el.getEditor) {
                        quillInstance.current = el.getEditor();
                    }
                } catch (_err) {
                    // Quill aún no está listo, el useEffect lo conectará después
                }
            }, 100);
        }
    };

    // Conectar botones del toolbar custom a la instancia Quill cuando esté lista
    useEffect(() => {
        if (mode !== 'free') return;
        // Esperar a que Quill esté listo
        const connectToolbar = () => {
            const editor = quillRef.current?.getEditor ? quillRef.current.getEditor() : null;
            if (!editor) { setTimeout(connectToolbar, 200); return; }
            quillInstance.current = editor;
        };
        const timer = setTimeout(connectToolbar, 300);
        return () => clearTimeout(timer);
    }, [mode]);

    // Modules para ReactQuill - toolbar inline (evita race condition con DOM)
    const quillModules = React.useMemo(() => ({
        toolbar: [
            [{ 'font': ['times-new-roman', 'arial', 'georgia', 'courier-new', 'verdana'] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean'],
        ],
        history: {
            delay: 1000,
            maxStack: 500,
            userOnly: true,
        },
    }), []);

    const quillFormats = [
        'font', 'size', 'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'align',
        'list', 'bullet', 'indent',
        'link', 'image',
        'header',
    ];

    // Logo Handlers
    const handleLogoUpload = (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (side === 'left') setLogoLeft(reader.result as string);
                else setLogoRight(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Signatory Handlers
    const addSignatory = () => {
        setSignatories([...signatories, { id: Date.now().toString(), name: '', role: '' }]);
    };

    const removeSignatory = (id: string) => {
        if (signatories.length > 1) {
            setSignatories(signatories.filter(s => s.id !== id));
        }
    };

    const updateSignatory = (id: string, field: keyof Signatory, value: string) => {
        setSignatories(signatories.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSignatureUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateSignatory(id, 'signatureUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // AI Generation Handler
    const handleGenerateDraft = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        setGeneratedDraft(null);

        try {
            const context = await fetchSystemContext([]);
            const result = await generateDocumentDraft(aiPrompt, context, aiConfig);

            if (result) {
                setGeneratedDraft(result);
            }
        } catch (error) {
            console.error(error);
            alert("Error generando el documento. Intenta de nuevo.");
        } finally {
            setIsGenerating(false);
        }
    };

    const applyDraft = () => {
        if (!generatedDraft) return;

        if (mode === 'template') {
            if (generatedDraft.docType) setDocType(generatedDraft.docType);
            if (generatedDraft.recipient) setRecipient(generatedDraft.recipient);
            setBody(generatedDraft.body);
        } else {
            const html = generatedDraft.body.replace(/\n/g, '<br/>');
            setFreeText(html);
            if (quillInstance.current) {
                quillInstance.current.root.innerHTML = html;
            }
        }
        setIsAiPanelOpen(false);
    };

    // Auto-save (solo para modo libre con Quill)
    const saveDocument = useCallback(async () => {
        if (mode !== 'free') return;
        const editor = quillRef.current?.getEditor ? quillRef.current.getEditor() : quillInstance.current;
        if (!editor) return;
        quillInstance.current = editor;

        setAutoSaveStatus('saving');
        try {
            const content = quillInstance.current?.root?.innerHTML || freeText;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            if (documentId) {
                const { error } = await supabase
                    .from('documents')
                    .update({ 
                        content, 
                        title: documentTitle, 
                        last_saved_at: new Date().toISOString(),
                        folder_path: folderName // Guardamos la referencia de la ruta
                    })
                    .eq('id', documentId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('documents')
                    .insert({
                        title: documentTitle,
                        content,
                        folder_path: folderName,
                        created_by: user.id
                    })
                    .select()
                    .single();
                if (error) throw error;
                setDocumentId(data.id);
            }

            // OPCIONAL: Generar versión PDF y subirla automáticamente al Drive si el usuario lo solicita
            // Para esta versión, lo dejaremos como un botón manual "Sincronizar con Drive"

            setAutoSaveStatus('saved');
            setLastSaved(new Date());
        } catch (error) {
            console.error('Error al guardar:', error);
            setAutoSaveStatus('error');
        }
    }, [mode, documentId, documentTitle]);

    // Auto-save interval
    useEffect(() => {
        if (mode === 'free') {
            const interval = setInterval(() => {
                if (quillInstance.current && freeText) {
                    saveDocument();
                }
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [mode, saveDocument, freeText]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveDocument();
            } else if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                if (mode === 'free') {
                    setShowFindReplace(true);
                    setFindReplaceMode('find');
                }
            } else if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                if (mode === 'free') {
                    setShowFindReplace(true);
                    setFindReplaceMode('replace');
                }
            } else if (e.key === 'F11') {
                e.preventDefault();
                setIsFullScreen(!isFullScreen);
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [isFullScreen, saveDocument, mode]);

    // Template handler
    const handleSelectTemplate = (template: any) => {
        if (mode !== 'free') return;
        if (!quillInstance.current) return;

        let processedContent = template.content;
        const today = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        processedContent = processedContent.replace(/\{\{fecha\}\}/g, today);
        processedContent = processedContent.replace(/\{\{lugar\}\}/g, 'Lima, Perú');

        quillInstance.current.root.innerHTML = processedContent;
        setDocumentTitle(template.name);
        setFreeText(processedContent);
    };

    // Download handlers
    // Calcular número de páginas basado en altura
    useEffect(() => {
        if (mode === 'free' && quillInstance.current) {
            const editorElement = document.querySelector('.ql-editor');
            if (editorElement) {
                const height = editorElement.scrollHeight;
                const a4HeightPx = 1123; // Altura aproximada de A4 a 96 DPI
                const calculatedPages = Math.max(1, Math.ceil(height / a4HeightPx));
                if (calculatedPages !== pageCount) {
                    setPageCount(calculatedPages);
                }
            }
        }
    }, [freeText, mode, pageCount]);

    const handleSyncToDrive = async () => {
        const element = document.getElementById('document-preview') || document.getElementById('document-preview-inner');
        if (!element) {
            alert("No se encontró el elemento de previsualización.");
            return;
        }

        setAutoSaveStatus('saving');
        try {
            const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            
            const pdfBlob = pdf.output('blob');
            const cleanTitle = documentTitle.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            const fileName = `${cleanTitle || 'documento'}.pdf`;
            
            // Asegurar que folderName termine en /
            const path = folderName.endsWith('/') ? folderName : (folderName ? `${folderName}/` : '');
            const filePath = `${path}${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('resources')
                .upload(filePath, pdfBlob, { 
                    contentType: 'application/pdf',
                    upsert: true 
                });

            if (uploadError) throw uploadError;

            // También guardar en la base de datos de archivos para que sea visible en el explorador
            await supabase.from('storage_files').upsert({
                name: fileName,
                folder_id: null, // Opcional si se usa el sistema de IDs, por ahora dejamos el path directo
                storage_path: filePath,
                bucket_id: 'resources',
                mime_type: 'application/pdf',
                size: pdfBlob.size,
                user_id: (await supabase.auth.getUser()).data.user?.id
            });

            setAutoSaveStatus('saved');
            setLastSaved(new Date());
        } catch (error) {
            console.error('Error sincronizando con Drive:', error);
            setAutoSaveStatus('error');
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('document-preview');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${mode === 'template' ? docType.toLowerCase() : documentTitle}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const handleDownloadWord = () => {
        const element = document.getElementById('document-preview');
        if (!element) return;

        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title><style>body { font-family: "Times New Roman", serif; font-size: 12pt; }</style></head><body>`;
        const footer = "</body></html>";
        const html = header + element.innerHTML + footer;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });

        saveAs(blob, `${mode === 'template' ? docType.toLowerCase() : documentTitle}.doc`);
    };

    return (
        <div className={`flex flex-col ${isFullScreen ? 'fixed top-0 left-0 w-screen h-screen z-[5000] bg-black/90' : 'h-screen'} ${t.editorBg}`}>
            {/* Top Bar */}
            <div className={`h-12 ${t.topBar} flex items-center justify-between px-4`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className={`p-1.5 ${theme === 'stitch' ? 'hover:bg-white/10' : 'hover:bg-white/20'} rounded ${t.text} transition-colors`}
                        title="Cerrar editor"
                    >
                        <StitchIcon name="close" lucideIndex={X} className="w-4 h-4" />
                    </button>
                    <div className={`${t.text}`}>
                        <StitchIcon name="description" lucideIndex={FileText} className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        className={`bg-transparent ${t.text} text-sm font-medium focus:outline-none ${theme === 'stitch' ? 'focus:bg-white/5' : 'focus:bg-white/10'} px-2 py-1 rounded w-64`}
                        placeholder="Título del documento"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {/* Botón Guardar visible */}
                    {mode === 'free' && (
                        <button
                            onClick={saveDocument}
                            title="Guardar (Ctrl+S)"
                            className={`flex items-center gap-1.5 px-3 py-1.5 ${t.btnSecondary} border rounded text-xs font-bold uppercase tracking-tight transition-all`}
                        >
                            <Save className="w-3.5 h-3.5" />
                            Guardar
                        </button>
                    )}
                    {mode === 'free' && <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />}

                    {/* Selector de Tema */}
                    <div className="flex items-center gap-1 bg-white/10 rounded p-0.5">
                        <button
                            onClick={() => setTheme('moderno')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${theme === 'moderno'
                                ? 'bg-white text-blue-600 font-medium'
                                : 'text-white/70 hover:text-white'}`}
                        >
                            Moderno
                        </button>
                        <button
                            onClick={() => setTheme('stitch')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${theme === 'stitch'
                                ? 'bg-white text-black font-medium'
                                : 'text-white/70 hover:text-white'}`}
                        >
                            Stitch
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAiPanelOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg group shadow-black/20"
                    >
                        <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
                        Asistente IA
                    </button>

                    <div className="flex items-center gap-1 bg-white/10 rounded p-0.5 mx-2">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className={`p-1 ${t.text} hover:bg-white/10 rounded`}>
                            <StitchIcon name="remove" lucideIndex={Minus} className="w-3 h-3" />
                        </button>
                        <span className={`text-xs w-12 text-center ${t.text}`}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className={`p-1 ${t.text} hover:bg-white/10 rounded`}>
                            <StitchIcon name="add" lucideIndex={Plus} className="w-3 h-3" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`p-1.5 ${theme === 'stitch' ? 'hover:bg-white/10' : 'hover:bg-white/20'} rounded ${t.text} transition-colors`}
                        title={isFullScreen ? 'Salir pantalla completa' : 'Pantalla completa'}
                    >
                        {isFullScreen ? (
                            <StitchIcon name="fullscreen_exit" lucideIndex={Minimize2} className="w-4 h-4" />
                        ) : (
                            <StitchIcon name="fullscreen" lucideIndex={Maximize2} className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Ribbon Tabs */}
            <div className={`h-9 ${t.ribbon} flex items-center px-4 gap-1`}>
                <button
                    onClick={() => setMode('template')}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'template'
                        ? 'bg-white ' + (theme === 'stitch' ? 'text-black' : 'text-[#2B579A]')
                        : 'text-white/80 hover:text-white ' + (theme === 'stitch' ? 'hover:bg-white/10' : 'hover:bg-white/10')
                        }`}
                >
                    <StitchIcon name="description" lucideIndex={List} className="w-3.5 h-3.5 inline mr-1.5" />
                    Plantilla
                </button>
                <button
                    onClick={() => setMode('free')}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'free'
                        ? 'bg-white ' + (theme === 'stitch' ? 'text-black' : 'text-[#2B579A]')
                        : 'text-white/80 hover:text-white ' + (theme === 'stitch' ? 'hover:bg-white/10' : 'hover:bg-white/10')
                        }`}
                >
                    <StitchIcon name="edit_note" lucideIndex={PenTool} className="w-3.5 h-3.5 inline mr-1.5" />
                    Editor Libre
                </button>

                {mode === 'free' && (
                    <>
                        <div className="ml-4 w-px h-6 bg-white/20" />
                        {['Inicio', 'Insertar', 'Vista'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveRibbonTab(tab.toLowerCase())}
                                className={`px-3 py-1.5 text-xs transition-colors ${activeRibbonTab === tab.toLowerCase()
                                    ? 'bg-white ' + (theme === 'stitch' ? 'text-black' : 'text-[#2B579A]') + ' font-medium'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </>
                )}
            </div>

            {/* Ribbon Toolbar - Solo para modo libre */}
            {mode === 'free' && (
                <div className={`${t.toolbar} ${t.border} border-b px-4 py-2 shadow-sm overflow-x-auto select-none`}>
                    {activeRibbonTab === 'inicio' && (
                        <div className="flex items-center gap-6 min-w-max">
                            {/* Group: Historial */}
                            <div className="flex flex-col gap-1 items-center">
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.history?.undo(); }}
                                        className={`p-1.5 ${t.buttonHover} rounded ${t.toolbarText} transition-colors`} title="Deshacer (Ctrl+Z)">
                                        <Undo className="w-4 h-4" />
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.history?.redo(); }}
                                        className={`p-1.5 ${t.buttonHover} rounded ${t.toolbarText} transition-colors`} title="Rehacer (Ctrl+Y)">
                                        <Redo className="w-4 h-4" />
                                    </button>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-30">Historial</span>
                            </div>

                            <div className={`w-px h-10 ${theme === 'stitch' ? 'bg-[#262626]' : 'bg-gray-200'}`} />

                            {/* Group: Tipografía */}
                            <div className="flex flex-col gap-1 items-center">
                                <div className="flex items-center gap-1.5">
                                    <select
                                        onChange={(e) => { quillInstance.current?.format('font', e.target.value); setRefresh(r => r + 1); }}
                                        className={`${t.input} ${t.toolbarText} text-[11px] font-medium px-2 py-1 rounded focus:outline-none border ${t.border} h-7`}
                                        value={activeFormats.font || "times-new-roman"}
                                    >
                                        <option value="times-new-roman">Times New Roman</option>
                                        <option value="arial">Arial</option>
                                        <option value="georgia">Georgia</option>
                                        <option value="courier-new">Courier New</option>
                                        <option value="verdana">Verdana</option>
                                    </select>
                                    <select
                                        onChange={(e) => { quillInstance.current?.format('size', e.target.value || false); setRefresh(r => r + 1); }}
                                        className={`${t.input} ${t.toolbarText} text-[11px] font-medium px-2 py-1 rounded focus:outline-none border ${t.border} w-14 h-7`}
                                        value={activeFormats.size || ""}
                                    >
                                        <option value="small">10</option>
                                        <option value="">12</option>
                                        <option value="large">14</option>
                                        <option value="huge">18</option>
                                    </select>
                                    <div className="flex items-center gap-0.5 ml-1">
                                        <button 
                                            onMouseDown={(e) => { e.preventDefault(); const q = quillInstance.current; if (q) { const f = q.getFormat(); q.format('bold', !f.bold); setRefresh(r => r + 1); } }} 
                                            className={`p-1.5 ${activeFormats.bold ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                            title="Negrita">
                                            <Bold className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onMouseDown={(e) => { e.preventDefault(); const q = quillInstance.current; if (q) { const f = q.getFormat(); q.format('italic', !f.italic); setRefresh(r => r + 1); } }} 
                                            className={`p-1.5 ${activeFormats.italic ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                            title="Cursiva">
                                            <Italic className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onMouseDown={(e) => { e.preventDefault(); const q = quillInstance.current; if (q) { const f = q.getFormat(); q.format('underline', !f.underline); setRefresh(r => r + 1); } }} 
                                            className={`p-1.5 ${activeFormats.underline ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                            title="Subrayado">
                                            <Underline className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-30">Tipografía</span>
                            </div>

                            <div className={`w-px h-10 ${theme === 'stitch' ? 'bg-[#262626]' : 'bg-gray-200'}`} />

                            {/* Group: Párrafo */}
                            <div className="flex flex-col gap-1 items-center">
                                <div className="flex items-center gap-0.5">
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.format('align', false); setRefresh(r => r + 1); }} 
                                        className={`p-1.5 ${!activeFormats.align ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                        title="Izquierda">
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.format('align', 'center'); setRefresh(r => r + 1); }} 
                                        className={`p-1.5 ${activeFormats.align === 'center' ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                        title="Centrar">
                                        <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.format('align', 'right'); setRefresh(r => r + 1); }} 
                                        className={`p-1.5 ${activeFormats.align === 'right' ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                        title="Derecha">
                                        <AlignRight className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.format('align', 'justify'); setRefresh(r => r + 1); }} 
                                        className={`p-1.5 ${activeFormats.align === 'justify' ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                        title="Justificar">
                                        <AlignJustify className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 mx-1 bg-gray-200/20" />
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); const q = quillInstance.current; if (q) { const f = q.getFormat(); q.format('list', f.list === 'ordered' ? false : 'ordered'); setRefresh(r => r + 1); } }} 
                                        className={`p-1.5 ${activeFormats.list === 'ordered' ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                        title="Lista Numerada">
                                        <ListOrdered className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); const q = quillInstance.current; if (q) { const f = q.getFormat(); q.format('list', f.list === 'bullet' ? false : 'bullet'); setRefresh(r => r + 1); } }} 
                                        className={`p-1.5 ${activeFormats.list === 'bullet' ? 'bg-exec-blue/20 text-exec-blue' : (t.buttonHover + ' ' + t.toolbarText)} rounded transition-all`} 
                                        title="Viñetas">
                                        <List className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 mx-1 bg-gray-200/20" />
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.format('indent', '-1'); }} 
                                        className={`p-1.5 ${t.buttonHover} rounded ${t.toolbarText} transition-all`} 
                                        title="Reducir Sangría">
                                        <span className="material-symbols-outlined text-[18px]">format_indent_decrease</span>
                                    </button>
                                    <button 
                                        onMouseDown={(e) => { e.preventDefault(); quillInstance.current?.format('indent', '+1'); }} 
                                        className={`p-1.5 ${t.buttonHover} rounded ${t.toolbarText} transition-all`} 
                                        title="Aumentar Sangría">
                                        <span className="material-symbols-outlined text-[18px]">format_indent_increase</span>
                                    </button>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-30">Párrafo</span>
                            </div>
                        </div>
                    )}

                    {activeRibbonTab === 'insertar' && (
                        <div className="flex items-center gap-6 min-w-max">
                            <div className="flex flex-col gap-1 items-center">
                                <div className="flex items-center gap-2">
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); /* Logic inside handleInsertImage or similar */ }}
                                        className={`flex items-center gap-2 px-3 py-1.5 ${t.buttonHover} rounded ${t.toolbarText} transition-all border ${t.border} text-[10px] font-bold uppercase tracking-wide`}>
                                        <ImageIcon className="w-4 h-4 text-exec-blue" />
                                        Imagen
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); /* Logic inside handleInsertTable or similar */ }}
                                        className={`flex items-center gap-2 px-3 py-1.5 ${t.buttonHover} rounded ${t.toolbarText} transition-all border ${t.border} text-[10px] font-bold uppercase tracking-wide`}>
                                        <Table className="w-4 h-4 text-exec-blue" />
                                        Tabla
                                    </button>
                                    <button
                                        onClick={() => setShowTemplateGallery(true)}
                                        className={`flex items-center gap-2 px-3 py-1.5 ${t.btnAI} rounded text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm`}>
                                        <Layout className="w-4 h-4 text-white" />
                                        Plantillas
                                    </button>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-30">Elementos</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Editor Area */}
            <div className={`flex-1 overflow-auto ${t.editorBg} relative ${t.scrollbar}`}>
                {mode === 'template' ? (
                    // MODO PLANTILLA - Formulario + Preview
                    <div className="flex gap-0 h-full w-full">
                        {/* Form Panel - 50% con scroll */}
                        <div className={`w-1/2 ${t.card} border-r p-6 pb-32 overflow-y-auto ${t.scrollbar}`}>
                            <h4 className={`text-sm font-semibold ${t.header} mb-4 uppercase tracking-wide flex items-center gap-2`}>
                                <StitchIcon name="settings" lucideIndex={FileType} className="w-4 h-4" />
                                Configuración del Documento
                            </h4>
                            
                            {/* ... (resto del formulario se mantiene igual) ... */}
                            <div className={`${t.accentBg} p-4 rounded border mb-6 transition-all`}>
                                <h5 className={`text-xs font-bold ${t.accentText} mb-4 uppercase tracking-wider flex items-center gap-2`}>
                                    <StitchIcon name="folder" lucideIndex={FileType} className="w-3.5 h-3.5" />
                                    Ubicación de Salida
                                </h5>
                                <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <span>Directorio Activo:</span>
                                    <span className="text-exec-blue bg-exec-blue/5 px-2 py-1 border border-exec-blue/20">{folderName || 'RAIZ'}</span>
                                </div>
                            </div>

                            <div className={`${t.accentBg} p-4 rounded border mb-6 transition-all`}>
                                <h5 className={`text-xs font-bold ${t.accentText} mb-4 uppercase tracking-wider flex items-center gap-2`}>
                                    <StitchIcon name="corporate_fare" lucideIndex={FileType} className="w-3.5 h-3.5" />
                                    Datos de la Organización
                                </h5>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`text-xs ${t.label} block mb-1.5 font-medium`}>Nombre Corto</label>
                                        <input
                                            type="text"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            placeholder="Ej: ACS"
                                            className={`w-full ${t.input} rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue transition-all`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-xs ${t.label} block mb-1.5 font-medium`}>Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={orgFullName}
                                            onChange={(e) => setOrgFullName(e.target.value)}
                                            placeholder="Ej: Alternativas en Ciencias Sociales"
                                            className={`w-full ${t.input} rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue transition-all`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-xs ${t.label} block mb-1.5 font-medium`}>Localidad</label>
                                        <input
                                            type="text"
                                            value={locality}
                                            onChange={(e) => setLocality(e.target.value)}
                                            placeholder="Ej: Cajamarca"
                                            className={`w-full ${t.input} rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue transition-all`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Logos */}
                                <div className={`${t.accentBg} p-4 rounded border space-y-4`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-bold ${t.header} flex items-center gap-2`}>
                                            <StitchIcon name="image" lucideIndex={ImageIcon} className="w-4 h-4" />
                                            Logos en Cabecera
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowLogos(true);
                                                    setLogoLeft('/certificates/logo-revista/logo-revista-ACS.png');
                                                    setLogoRight('/certificates/logo-unc/R.png');
                                                }}
                                                className={`text-[10px] font-bold uppercase px-3 py-1 rounded border ${t.border} ${t.buttonHover} ${t.accentText} transition-all`}
                                            >
                                                Logos Oficiales
                                            </button>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={showLogos} onChange={(e) => setShowLogos(e.target.checked)} className="sr-only peer" />
                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-exec-blue"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {showLogos && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={`text-xs ${t.label} block mb-2 font-medium`}>Logo Izquierdo</label>
                                                <label className={`cursor-pointer ${t.input} border-2 border-dashed border-[#262626] rounded p-4 flex flex-col items-center justify-center gap-2 transition-all hover:border-exec-blue group min-h-[100px]`}>
                                                    {logoLeft ? (
                                                        <img src={logoLeft} className="h-16 object-contain" />
                                                    ) : (
                                                        <>
                                                            <StitchIcon name="upload_file" lucideIndex={Upload} className={`w-6 h-6 ${t.label} group-hover:text-exec-blue`} />
                                                            <span className={`text-[10px] ${t.label} group-hover:text-exec-blue uppercase font-bold`}>Cargar</span>
                                                        </>
                                                    )}
                                                    <input type="file" accept="image/*" onChange={(e) => handleLogoUpload('left', e)} className="hidden" />
                                                </label>
                                            </div>
                                            <div>
                                                <label className={`text-xs ${t.label} block mb-2 font-medium`}>Logo Derecho</label>
                                                <label className={`cursor-pointer ${t.input} border-2 border-dashed border-[#262626] rounded p-4 flex flex-col items-center justify-center gap-2 transition-all hover:border-exec-blue group min-h-[100px]`}>
                                                    {logoRight ? (
                                                        <img src={logoRight} className="h-16 object-contain" />
                                                    ) : (
                                                        <>
                                                            <StitchIcon name="upload_file" lucideIndex={Upload} className={`w-6 h-6 ${t.label} group-hover:text-exec-blue`} />
                                                            <span className={`text-[10px] ${t.label} group-hover:text-exec-blue uppercase font-bold`}>Cargar</span>
                                                        </>
                                                    )}
                                                    <input type="file" accept="image/*" onChange={(e) => handleLogoUpload('right', e)} className="hidden" />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tipo de Documento */}
                                <div>
                                    <label className={`text-sm font-bold ${t.header} block mb-2 uppercase tracking-tight`}>Tipo de Documento</label>
                                    <select
                                        value={docType}
                                        onChange={(e) => { setDocType(e.target.value); setDocNumber(1); }}
                                        className={`w-full ${t.input} rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue appearance-none cursor-pointer group transition-all`}
                                    >
                                        <option value="OFICIO">OFICIO</option>
                                        <option value="SOLICITUD">SOLICITUD</option>
                                        <option value="ACTA">ACTA</option>
                                        <option value="MEMORANDO">MEMORÁNDUM</option>
                                        <option value="CIRCULAR">CIRCULAR</option>
                                        <option value="CARTA">CARTA</option>
                                        <option value="INFORME">INFORME</option>
                                    </select>
                                </div>

                                {/* Número de Documento */}
                                <div>
                                    <label className={`text-sm font-bold ${t.header} block mb-2 uppercase tracking-tight`}>Número de Documento</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={docNumber}
                                        onChange={(e) => setDocNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                        className={`w-full ${t.input} rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue transition-all`}
                                    />
                                </div>

                                {/* Destinatario */}
                                <div>
                                    <label className={`text-sm font-bold ${t.header} block mb-2 uppercase tracking-tight`}>Destinatario</label>
                                    <input
                                        type="text"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        placeholder="Sr. Rector de la Universidad Nacional de Cajamarca"
                                        className={`w-full ${t.input} rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue placeholder:text-gray-600 transition-all`}
                                    />
                                </div>

                                {/* Cuerpo */}
                                <div>
                                    <label className={`text-sm font-bold ${t.header} block mb-2 uppercase tracking-tight`}>Asunto / Cuerpo del Documento</label>
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Escriba aquí el contenido detallado del documento..."
                                        className={`w-full ${t.input} rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue min-h-[250px] resize-y leading-relaxed placeholder:text-gray-600 transition-all shadow-inner`}
                                    />
                                </div>

                                {/* Firmantes */}
                                <div className={`${t.border} border-t pt-6 mb-8`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className={`text-sm font-bold ${t.header} uppercase tracking-wider flex items-center gap-2`}>
                                            <StitchIcon name="signature" lucideIndex={Plus} className="w-4 h-4" />
                                            Firmantes Autorizados
                                        </h4>
                                        <button onClick={addSignatory} className={`text-xs flex items-center gap-1.5 px-3 py-1.5 ${t.btnSecondary} rounded font-bold uppercase tracking-tight transition-all`}>
                                            <StitchIcon name="add" lucideIndex={Plus} className="w-3.5 h-3.5" /> Añadir
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {signatories.map((signer) => (
                                            <div key={signer.id} className={`${t.accentBg} p-5 rounded border relative group transition-all hover:border-exec-blue/50`}>
                                                {signatories.length > 1 && (
                                                    <button
                                                        onClick={() => removeSignatory(signer.id)}
                                                        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <StitchIcon name="delete" lucideIndex={Trash2} className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className={`text-[10px] ${t.label} block mb-1.5 font-bold uppercase`}>Nombre Completo</label>
                                                        <input
                                                            type="text"
                                                            value={signer.name}
                                                            onChange={(e) => updateSignatory(signer.id, 'name', e.target.value)}
                                                            className={`w-full ${t.input} rounded px-3 py-2 text-xs focus:ring-1 focus:ring-exec-blue transition-all`}
                                                            placeholder="Edwar J. Saenz"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] ${t.label} block mb-1.5 font-bold uppercase`}>Cargo / Rol</label>
                                                        <input
                                                            type="text"
                                                            value={signer.role}
                                                            onChange={(e) => updateSignatory(signer.id, 'role', e.target.value)}
                                                            className={`w-full ${t.input} rounded px-3 py-2 text-xs focus:ring-1 focus:ring-exec-blue transition-all`}
                                                            placeholder="Director Ejecutivo"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`text-[10px] ${t.label} block mb-2 font-bold uppercase`}>Firma Digital (Imagen)</label>
                                                    <div className="flex items-center gap-3">
                                                        <label className={`cursor-pointer ${t.btnSecondary} px-4 py-2 text-[10px] font-bold uppercase rounded flex items-center gap-2 transition-all`}>
                                                            <StitchIcon name="upload" lucideIndex={Upload} className="w-3.5 h-3.5" />
                                                            {signer.signatureUrl ? 'Cambiar Firma' : 'Cargar Firma'}
                                                            <input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(signer.id, e)} className="hidden" />
                                                        </label>
                                                        {signer.signatureUrl && (
                                                            <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold uppercase">
                                                                <StitchIcon name="check_circle" lucideIndex={Check} className="w-3.5 h-3.5" />
                                                                Verificada
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Panel - A4 Architecture */}
                        <div className={`w-1/2 a4-editor-container ${t.scrollbar}`}>
                            <div
                                id="document-preview"
                                className="a4-page mx-auto"
                                style={{
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.2s ease-in-out'
                                }}
                            >
                                <div id="document-preview-inner" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                    {/* Header */}
                                    <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        {showLogos && (
                                            <div className="w-16 h-16 flex items-center justify-center">
                                                {logoLeft ? (
                                                    <img src={logoLeft} className="max-w-full max-h-full object-contain" alt="Logo Izq" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-full text-[8px] text-gray-400">LOGO</div>
                                                )}
                                            </div>
                                        )}

                                        <div className="text-center flex-1 mx-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.15em', margin: 0, fontFamily: "'Times New Roman', Times, serif" }}>{orgName}</h2>
                                            <p style={{ fontSize: '12pt', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px', fontFamily: "'Times New Roman', Times, serif" }}>{orgFullName}</p>
                                        </div>

                                        {showLogos && (
                                            <div className="w-16 h-16 flex items-center justify-center">
                                                {logoRight ? (
                                                    <img src={logoRight} className="max-w-full max-h-full object-contain" alt="Logo Der" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-full text-[8px] text-gray-400">LOGO</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Document Type & Date */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <p style={{ fontWeight: 'bold', fontSize: '12pt', textDecoration: 'underline', textTransform: 'uppercase', textAlign: 'center', margin: 0, fontFamily: "'Times New Roman', Times, serif" }}>{docType} N° {String(docNumber).padStart(3, '0')}-{new Date().getFullYear()}-{orgName}/SEC</p>
                                        <p style={{ fontSize: '12pt', marginTop: '8px', textAlign: 'right', fontFamily: "'Times New Roman', Times, serif" }}>{locality}, {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>

                                    {/* Content */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div>
                                            <p style={{ fontWeight: 'bold', margin: 0, fontSize: '12pt', fontFamily: "'Times New Roman', Times, serif" }}>SEÑOR(A):</p>
                                            <p style={{ textTransform: 'uppercase', fontWeight: '500', margin: 0, fontSize: '12pt', fontFamily: "'Times New Roman', Times, serif" }}>{recipient || '_____________________'}</p>
                                        </div>

                                        <div style={{ textAlign: 'justify', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt' }}>
                                            {body || '(El contenido del documento aparecerá aquí...)'}
                                        </div>
                                    </div>

                                    {/* Signatures */}
                                    <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: signatories.length > 1 ? '1fr 1fr' : '1fr', gap: '2rem', maxWidth: signatories.length > 1 ? '100%' : '250px', marginLeft: signatories.length > 1 ? '0' : 'auto', marginRight: signatories.length > 1 ? '0' : 'auto' }}>
                                        {signatories.map((signer) => (
                                            <div key={signer.id} style={{ textAlign: 'center' }}>
                                                <div style={{ height: '4rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                                    {signer.signatureUrl ? (
                                                        <img src={signer.signatureUrl} alt="Firma" className="max-h-full max-w-full object-contain" />
                                                    ) : (
                                                        <div style={{ width: '100%', borderTop: '1px solid #000' }}></div>
                                                    )}
                                                </div>
                                                <p style={{ fontWeight: 'bold', fontSize: '12pt', margin: 0, fontFamily: "'Times New Roman', Times, serif" }}>{signer.name || '___________________'}</p>
                                                <p style={{ fontSize: '12pt', margin: 0, fontFamily: "'Times New Roman', Times, serif" }}>{signer.role || '___________________'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // MODO EDITOR LIBRE - A4 Word-Web Architecture
                    <div className={`flex-1 overflow-auto ${t.scrollbar} ${theme === 'stitch' ? 'stitch-mode' : ''}`}>
                        <div className="a4-page-stack py-10">
                            <div 
                                className="relative mx-auto w-[21cm] bg-white shadow-2xl min-h-[29.7cm]" 
                                style={{
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.2s ease-in-out'
                                }}
                            >
                                {/* Ruler simulation */}
                                <div className="word-ruler">
                                    <div className="flex-1 flex justify-between px-1">
                                        {[...Array(16)].map((_, i) => (
                                            <span key={i} className="border-l border-gray-300 h-1">{i + 1}</span>
                                        ))}
                                    </div>
                                </div>

                                <QuillErrorBoundary>
                                    <React.Suspense fallback={
                                        <div className="flex items-center justify-center" style={{ minHeight: '29.7cm' }}>
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs uppercase tracking-wide">Cargando motor de texto...</span>
                                            </div>
                                        </div>
                                    }>
                                        <QuillEditor
                                            ref={handleQuillRef}
                                            value={freeText}
                                            onChange={(val: string) => setFreeText(val)}
                                            modules={quillModules}
                                            formats={quillFormats}
                                            theme="snow"
                                            placeholder="Comienza a escribir tu documento con fidelidad Word..."
                                            className="doc-quill-editor"
                                        />
                                    </React.Suspense>
                                </QuillErrorBoundary>

                                {/* Dynamic Footers and Page Breaks Layer */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[...Array(pageCount)].map((_, i) => (
                                        <React.Fragment key={i}>
                                            {/* Page Footer */}
                                            <div 
                                                className="absolute left-0 w-full text-center flex items-center justify-center gap-2 text-[9px] text-gray-400 uppercase tracking-widest font-bold"
                                                style={{ top: `${(i + 1) * 29.7 - 1.2}cm`, height: '1cm' }}
                                            >
                                                <span>Página {i + 1} de {pageCount}</span>
                                                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                                <span>{locality}</span>
                                            </div>
                                            
                                            {/* Visual Page Break Line (except for last page) */}
                                            {i < pageCount - 1 && (
                                                <div 
                                                    className="absolute left-0 w-full h-[2px] bg-[#0a0a0a]/5"
                                                    style={{ top: `${(i + 1) * 29.7}cm` }}
                                                />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - Download & Sync Buttons */}
            <div className={`h-12 ${theme === 'stitch' ? 'bg-black border-t border-[#262626]' : 'bg-white border-t border-gray-300'} flex items-center justify-between px-6 shadow-inner`}>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>
                        {mode === 'template' ? `DOC: ${docType}` : `PÁGINAS: ${pageCount} | PALABRAS: ${freeText.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length}`}
                    </span>
                    <div className="w-px h-4 bg-gray-700" />
                    <span className="text-[10px] font-black text-exec-blue uppercase tracking-widest">{folderName || 'RAIZ'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSyncToDrive}
                        className={`flex items-center gap-2 px-4 py-1.5 bg-exec-blue hover:bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-tight transition-all shadow-glow`}
                    >
                        <StitchIcon name="sync" lucideIndex={Save} className="w-3.5 h-3.5" /> 
                        Sincronizar con Drive
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-1" />
                    <button
                        onClick={handleDownloadWord}
                        className={`flex items-center gap-2 px-4 py-1.5 ${t.btnPrimary} rounded text-[10px] font-bold uppercase tracking-tight transition-all shadow-sm`}
                    >
                        <StitchIcon name="description" lucideIndex={FileText} className="w-3.5 h-3.5" /> Word
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className={`flex items-center gap-2 px-4 py-1.5 ${theme === 'stitch' ? 'bg-exec-red hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} rounded text-[10px] font-bold uppercase tracking-tight transition-all shadow-sm`}
                    >
                        <StitchIcon name="picture_as_pdf" lucideIndex={FileDown} className="w-3.5 h-3.5" /> PDF
                    </button>
                </div>
            </div>

            {/* Global Styles */}
            <style>{`
                .stitch-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .stitch-scrollbar::-webkit-scrollbar-track { background: #050505; }
                .stitch-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
                .stitch-scrollbar::-webkit-scrollbar-thumb:hover { background: #333333; }

                /* Editor Quill estilo hoja A4 tipo Word */
                .doc-quill-editor .ql-container {
                    border: none !important;
                    font-family: 'Times New Roman', Times, serif !important;
                    font-size: 12pt !important;
                    min-height: 29.7cm;
                }
                .doc-quill-editor .ql-editor {
                    padding: 2.54cm !important;
                    min-height: 29.7cm;
                    font-family: 'Times New Roman', Times, serif !important;
                    font-size: 12pt !important;
                    line-height: 1.5 !important;
                    color: #000 !important;
                    background-image: linear-gradient(to bottom, transparent 29.65cm, rgba(0,0,0,0.05) 29.65cm, rgba(0,0,0,0.05) 29.7cm, transparent 29.7cm);
                    background-size: 100% 29.7cm;
                }
                .stitch-mode .doc-quill-editor .ql-editor {
                    background-image: linear-gradient(to bottom, transparent 29.65cm, #0a0a0a 29.65cm, #0a0a0a 29.7cm, transparent 29.7cm);
                }
                .doc-quill-editor .ql-editor p { margin-bottom: 0px; }
                .doc-quill-editor .ql-toolbar { display: none !important; }
                .doc-quill-editor .ql-editor:focus { outline: none; }

                /* A4 Multi-page Simulation */
                .a4-page-stack {
                    background: #f3f4f6;
                    padding: 60px 0;
                    min-height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .a4-sheet {
                    width: 21cm;
                    min-height: 29.7cm;
                    background: white;
                    box-shadow: 0 0 15px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.05);
                    position: relative;
                    transition: transform 0.2s;
                }

                .stitch-mode .a4-page-stack {
                    background: #050505;
                }

                /* Word-like Ruler */
                .word-ruler {
                    width: 21cm;
                    height: 18px;
                    background: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    padding: 0 2.54cm;
                    font-size: 8px;
                    color: #9ca3af;
                }
                .stitch-mode .word-ruler {
                    background: #171717;
                    border-color: #262626;
                }
            `}</style>

            {/* Modals */}
            {
                mode === 'free' && (
                    <>
                        <FindReplacePanel
                            isOpen={showFindReplace}
                            onClose={() => setShowFindReplace(false)}
                            quillInstance={quillInstance.current}
                            mode={findReplaceMode}
                        />

                        <TemplateGallery
                            isOpen={showTemplateGallery}
                            onClose={() => setShowTemplateGallery(false)}
                            onSelectTemplate={handleSelectTemplate}
                        />
                    </>
                )
            }

            {/* AI Assistant Modal */}
            {
                isAiPanelOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setIsAiPanelOpen(false)}>
                        <div className={`${t.card} w-full max-w-2xl p-8 shadow-2xl rounded-sm border-exec-blue/20`} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                        <span className="material-symbols-outlined text-exec-blue text-[24px]">smart_toy</span>
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold ${t.header} tracking-tight uppercase`}>Asistente Inteligente</h3>
                                        <p className={`text-[10px] font-bold text-exec-blue uppercase tracking-widest font-sans`}>Generación de Propuesta Ejecutiva</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAiPanelOpen(false)} className={`p-2 hover:bg-white/5 rounded transition-all text-gray-400`}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ej: Necesito un oficio dirigido al Sr. Rector solicitando un espacio para un evento el 15 de marzo..."
                                    className={`w-full ${t.input} rounded p-4 text-sm focus:outline-none focus:ring-1 focus:ring-exec-blue min-h-[150px] resize-none leading-relaxed transition-all shadow-inner`}
                                />

                                <div className="space-y-4">
                                     <AIEngineSelector 
                                        config={aiConfig} 
                                        onConfigChange={setAiConfig}
                                        variant="minimal"
                                     />
                                        <button
                                            onClick={handleGenerateDraft}
                                            disabled={isGenerating || !aiPrompt.trim()}
                                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-100 text-black rounded-none text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                                                    PROCESANDO...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-exec-blue text-[20px]">smart_toy</span>
                                                    GENERAR PROPUESTA
                                                </>
                                            )}
                                        </button>
                                </div>

                                {generatedDraft && (
                                    <div className={`${theme === 'stitch' ? 'bg-[#111111] border-green-500/30' : 'bg-green-50 border-green-200'} border rounded p-5 transition-all animate-pulse`}>
                                        <p className={`text-xs ${theme === 'stitch' ? 'text-green-400' : 'text-green-800'} font-bold mb-3 uppercase flex items-center gap-2`}>
                                            <StitchIcon name="check_circle" lucideIndex={Check} className="w-4 h-4" />
                                            Documento listo para aplicar
                                        </p>
                                        <button
                                            onClick={applyDraft}
                                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold uppercase tracking-widest transition-all"
                                        >
                                            APLICAR AL EDITOR
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
