import React, { useRef, useState, useEffect } from 'react';
import { useDrive, DriveItem } from '../../hooks/useDrive';
import { supabase } from '../../lib/supabase';
import { getUserColor } from '../../lib/userColors';
import { PdfThumbnail } from '../resources/PdfThumbnail';
import {
    MoreVertical, Download, Trash2, Edit2,
    Grid, List, ChevronRight, Home, Upload, Plus, Search, X, ArrowLeft
} from 'lucide-react';

interface TaskMetadata {
    taskId: string;
    title: string;
    completedBy?: string;
    completedByName?: string;
    completedAt?: string;
    description?: string;
    assignedTo?: string;
    assignedToName?: string;
}

interface DriveExplorerProps {
    bucketName?: string;
    initialPath?: string;
    onOpenFile?: (file: DriveItem) => void;
    title?: string;
    subtitle?: string;
    moduleName?: string;
    icon?: string;
    showEditorAction?: boolean;
    showTaskMetadata?: boolean;
    onEditorClick?: (path?: string) => void;
}


const WindowsFolderIcon: React.FC<{ className?: string; color?: string }> = ({ className, color }) => {
    const id = React.useId().replace(/:/g, '');
    return (
    <div className={`relative ${className} flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
            {/* Folder Shadow/Glow */}
            <defs>
                <linearGradient id={`folderGradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: color || '#FFD43B', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: color ? `${color}dd` : '#F59F00', stopOpacity: 1 }} />
                </linearGradient>
                <filter id={`innerShadow-${id}`}>
                    <feOffset dx="0" dy="1" />
                    <feGaussianBlur stdDeviation="0.5" result="offset-blur" />
                    <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                    <feFlood floodColor="black" floodOpacity="0.2" result="color" />
                    <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                    <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                </filter>
            </defs>
            {/* Back part of the folder */}
            <path d="M2 6C2 4.89543 2.89543 4 4 4H9.17157C9.70201 4 10.2107 4.21071 10.5858 4.58579L12.4142 6.41421C12.7893 6.78929 13.298 7 13.8284 7H20C21.1046 7 22 7.89543 22 9V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill={`url(#folderGradient-${id})`} opacity="0.9" />
            {/* Front part of the folder with a slight offset and brighter color */}
            <path d="M2 9C2 7.89543 2.89543 7 4 7H20C21.1046 7 22 7.89543 22 9V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V9Z" fill={`url(#folderGradient-${id})`} filter={`url(#innerShadow-${id})`} />
            {/* Detail lines to simulate the 'tab' look */}
            <path d="M4 7H20V9H4V7Z" fill="white" opacity="0.1" />
        </svg>
    </div>
    );
};

export const DriveExplorer: React.FC<DriveExplorerProps> = ({
    bucketName = 'resources',
    initialPath = '',
    onOpenFile,
    title = 'Gestión Documental',
    subtitle = 'Almacenamiento y administración centralizada de activos.',
    moduleName = 'SECRETARÍA',
    icon = 'inventory_2',
    showEditorAction = false,
    showTaskMetadata = false,
    onEditorClick
}) => {
    const { currentPath, items: rawItems, loading, actions } = useDrive(bucketName, initialPath);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<DriveItem | null>(null);
    const [taskMetadata, setTaskMetadata] = useState<Map<string, TaskMetadata>>(new Map());
    const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [itemToRename, setItemToRename] = useState<DriveItem | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const [itemToDelete, setItemToDelete] = useState<DriveItem | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filtering & Sorting (Folders first, then alphabetical)
    const filteredItems = [...rawItems]
        .filter(i => i.name.toLowerCase().includes(search.toLowerCase()) && i.name !== '.keep')
        .sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

    // Load Task Metadata if enabled
    useEffect(() => {
        if (showTaskMetadata && (currentPath === 'tareas-completas/' || currentPath.startsWith('tareas-completas/'))) {
            loadTasksMetadata(rawItems);
        }
    }, [currentPath, rawItems, showTaskMetadata]);

    const loadTasksMetadata = async (entries: DriveItem[]) => {
        try {
            const taskIds = entries
                .filter(e => e.type === 'folder')
                .map(e => e.name.replace('/', ''))
                .filter(id => id && id !== '.keep');

            if (taskIds.length === 0) return;

            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`
                    id, title, description, completed_at, completed_by, assigned_to,
                    completedByUser:completed_by(full_name),
                    assignedUser:assigned_to(full_name)
                `)
                .in('id', taskIds);

            if (tasksError) throw tasksError;

            const metadata = new Map<string, TaskMetadata>();
            (tasksData || []).forEach((task: any) => {
                metadata.set(task.id, {
                    taskId: task.id,
                    title: task.title,
                    completedBy: task.completed_by,
                    completedByName: task.completedByUser?.full_name || 'Desconocido',
                    completedAt: task.completed_at,
                    description: task.description,
                    assignedTo: task.assigned_to,
                    assignedToName: task.assignedUser?.full_name || 'Sin asignar',
                });
            });

            setTaskMetadata(metadata);
        } catch (e) {
            console.error('Error cargando metadata de tareas:', e);
        }
    };

    // Handlers
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            Array.from(e.target.files as FileList).forEach((file: File) => actions.uploadFile(file));
        }
    };

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            actions.createFolder(newFolderName);
            setNewFolderName('');
            setIsCreateModalOpen(false);
        }
    };

    const handleRename = () => {
        if (itemToRename && renameValue.trim() && renameValue !== itemToRename.name) {
            actions.renameItem(itemToRename, renameValue);
            setItemToRename(null);
            setRenameValue('');
        }
    };

    const handleDelete = () => {
        if (itemToDelete) {
            actions.deleteItem(itemToDelete);
            setItemToDelete(null);
            setSelectedItem(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
            {/* ═══ HEADER (Task-Style Alignment) ═══ */}
            <header className="px-4 md:px-6 py-4 border-b border-exec-border bg-black z-20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-exec-blue/60 font-inter">
                                {moduleName}
                            </span>
                        </div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 font-inter leading-none">
                            <span className="material-symbols-outlined text-exec-blue text-2xl">
                                {icon || 'folder_open'}
                            </span>
                            <span>
                                {title.split(' ').slice(0, -1).join(' ')} <span className="text-exec-blue">{title.split(' ').slice(-1)}</span>
                            </span>
                        </h1>
                        <p className="text-[8px] font-medium uppercase tracking-[0.2em] text-gray-500 mt-1 font-inter">
                            ALMACENAMIENTO Y ADMINISTRACIÓN CENTRALIZADA DE ACTIVOS.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {showEditorAction && (
                            <button
                                onClick={() => onEditorClick?.(currentPath)}
                                className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-exec-blue/20 flex items-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Nuevo Registro
                            </button>
                        )}
                        <div className="flex items-center gap-2 text-[8px] font-black tracking-widest text-exec-blue bg-exec-blue/5 px-3 py-1.5 border border-exec-blue/20 uppercase font-inter rounded-none">
                            <div className="w-2 h-2 border border-exec-blue/50 flex items-center justify-center">
                                <div className="w-1 h-1 bg-exec-blue"></div>
                            </div>
                            SISTEMA ACTIVO
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══ NAVIGATION & TOOLBAR (Subtle Google Style) ═══ */}
            <div className="px-4 md:px-6 py-2 border-b border-exec-border/30 bg-[#050505]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Simplified Breadcrumbs */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
                        {currentPath && (
                            <button 
                                onClick={() => actions.navigateUp()}
                                className="flex items-center justify-center w-8 h-8 border border-exec-border bg-[#0A0A0A] hover:bg-white/5 transition-all text-gray-500 hover:text-white"
                                title="Volver atrás"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={() => actions.navigateTo('')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border border-exec-border bg-[#0A0A0A] transition-all ${!currentPath ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">home</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-exec-blue ml-1">
                                RAIZ
                            </span>
                        </button>
                        
                        {(currentPath || '').split('/').filter(Boolean).map((part, i, arr) => {
                            const isLast = i === arr.length - 1;
                            const targetPath = arr.slice(0, i + 1).join('/') + '/';
                            return (
                                <div key={i} className="flex items-center">
                                    <span className="material-symbols-outlined text-[14px] text-gray-700">chevron_right</span>
                                    <button
                                        onClick={() => actions.navigateTo(targetPath)}
                                        className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${isLast ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                    >
                                        {part}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-3.5 h-3.5" />
                            <input
                                type="text"
                                placeholder="FILTRAR REGISTROS..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-0"
                            />
                        </div>

                        <div className="flex bg-[#111] rounded-sm p-1 border border-[#222]">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-[#222] text-white' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                <Grid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-sm transition-all ${viewMode === 'list' ? 'bg-[#222] text-white' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECONDARY ACTIONS BAR (Slim) */}
            <div className="px-4 md:px-6 py-2 bg-black flex items-center gap-3 border-b border-exec-border/30 rounded-none">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white text-black text-[10px] font-black uppercase tracking-wider rounded-none hover:bg-exec-blue hover:text-white transition-all shadow-sm"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Subir Registro
                </button>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-transparent border border-exec-border text-gray-400 text-[10px] font-black uppercase tracking-wider rounded-none hover:border-exec-blue hover:text-white transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Carpeta
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    className="hidden"
                    multiple
                />
            </div>


            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 relative custom-scrollbar">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 transition-opacity">
                        <div className="animate-spin rounded-sm h-8 w-8 border-b-2 border-exec-blue"></div>
                    </div>
                )}

                {filteredItems.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full py-24 text-gray-600 border border-dashed border-exec-border rounded-sm bg-[#0D0D0D]">
                        <span className="material-symbols-outlined text-6xl mb-6 text-exec-border opacity-50">folder_off</span>
                        <p className="font-bold text-gray-500 uppercase tracking-widest text-xs font-inter">Esta carpeta está vacía</p>
                        <p className="text-[10px] mt-2 uppercase tracking-widest opacity-40 font-inter">Directorio sin registros</p>
                    </div>
                )}

                {viewMode === 'grid' && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                        {filteredItems.map((item) => {
                            const taskId = item.type === 'folder' ? item.name.replace('/', '') : null;
                            const meta = taskId ? taskMetadata.get(taskId) : null;
                            const ownerColor = meta?.assignedTo ? getUserColor(meta.assignedTo) :
                                meta?.completedBy ? getUserColor(meta.completedBy) : '#3b82f6';
                            
                            const isPdf = item.name.toLowerCase().endsWith('.pdf');

                            return (
                            <div
                                key={item.id}
                                onClick={() => item.type === 'folder' ? actions.navigate(item.name) : (onOpenFile ? onOpenFile(item) : setPreviewFile(item))}
                                className="group flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 relative p-2 rounded-none hover:bg-white/[0.02]"
                            >
                                {/* Menu Action */}
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                        className="p-1 hover:bg-white/10 text-gray-600 hover:text-white transition-colors"
                                    >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Icon Area */}
                                <div className="flex items-center justify-center">
                                    {item.type === 'folder' ? (
                                        <div className="relative transform group-hover:scale-105 transition-transform duration-300">
                                            <WindowsFolderIcon 
                                                className="w-14 h-14"
                                                color={meta ? ownerColor : undefined}
                                            />
                                        </div>
                                    ) : isPdf ? (
                                        <div className="w-12 h-14 opacity-90 group-hover:opacity-100 transition-all duration-300 rounded-sm overflow-hidden shadow-2xl group-hover:scale-105">
                                            <PdfThumbnail bucketName={bucketName} filePath={item.id} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 flex items-center justify-center group-hover:scale-105 transition-transform">
                                            <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-exec-blue transition-colors">description</span>
                                        </div>
                                    )}
                                </div>

                                {/* Label Area */}
                                <div className="text-center w-full px-2">
                                    <h4 className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors font-inter truncate tracking-wide" title={item.name}>
                                        {meta?.title || item.name}
                                    </h4>
                                    {meta && (
                                        <div className="flex items-center justify-center gap-1.5 mt-1">
                                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: ownerColor }}></div>
                                            <p className="text-[8px] font-black uppercase tracking-widest font-inter opacity-60" style={{ color: ownerColor }}>
                                                {meta.assignedToName || meta.completedByName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="bg-[#0A0A0A] border border-exec-border rounded-none overflow-hidden mx-2">
                        <table className="w-full text-[11px] text-left uppercase tracking-widest font-inter">
                            <thead className="text-[10px] text-gray-500 bg-[#0D0D0D] border-b border-exec-border font-black">
                                <tr>
                                    <th className="px-6 py-4 text-exec-blue">Nombre / Recurso</th>
                                    <th className="px-6 py-4">Peso</th>
                                    <th className="px-6 py-4">Sincronización</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-exec-border/30">
                                {filteredItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => item.type === 'folder' ? actions.navigate(item.name) : (onOpenFile ? onOpenFile(item) : setPreviewFile(item))}
                                        className="hover:bg-white/5 cursor-pointer transition-all group"
                                    >
                                        <td className="px-6 py-4 flex items-center gap-4 font-bold text-gray-300 group-hover:text-exec-blue transition-colors">
                                            {item.type === 'folder' ? (
                                                <WindowsFolderIcon className="w-5 h-5" />
                                            ) : (
                                                <span className="material-symbols-outlined text-[20px]">description</span>
                                            )}
                                            {item.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {item.type === 'folder' ? '-' : (item.size ? (item.size / 1024).toFixed(1) + ' KB' : '-')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                className="p-1.5 hover:bg-[#1A1A1A] text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* === MODALS === */}

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 bg-black/98 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
                    <div className="bg-[#0A0A0A] border border-exec-border rounded-sm max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-exec-border flex items-center justify-between bg-[#0D0D0D]">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-2xl text-exec-blue">description</span>
                                <div>
                                    <h3 className="font-bold text-white uppercase tracking-widest text-sm truncate max-w-md font-orbitron">{previewFile.name}</h3>
                                    <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-1 font-inter">Visualización de Activos SGR-ACS</p>
                                </div>
                            </div>
                            <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-[#111] text-gray-500 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
                            {previewFile.name.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={previewFile.url} className="w-full h-full min-h-[70vh] border-none bg-white" title={previewFile.name} />
                            ) : previewFile.mimeType?.startsWith('image') ? (
                                <img src={previewFile.url} className="max-w-full max-h-full object-contain shadow-2xl" alt={previewFile.name} />
                            ) : (
                                <div className="text-center space-y-6 p-20">
                                    <span className="material-symbols-outlined text-7xl text-gray-800">draft</span>
                                    <p className="text-gray-500 uppercase tracking-[0.3em] text-xs font-black font-inter">Previsualización no disponible para este formato</p>
                                    <a href={previewFile.url} target="_blank" rel="noreferrer" className="inline-block px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all font-inter">Descargar Archivo</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu Modal */}
            {selectedItem && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="bg-black border border-exec-border rounded-sm p-8 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-5 border-b border-exec-border pb-6">
                            <span className="material-symbols-outlined text-4xl text-exec-blue">
                                {selectedItem.type === 'folder' ? 'folder' : 'description'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg truncate text-white uppercase tracking-wider font-orbitron" title={selectedItem.name}>{selectedItem.name}</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black font-inter">{selectedItem.type}</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-600 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedItem.url && (
                                <a
                                    href={selectedItem.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-4 w-full p-4 bg-[#0A0A0A] border border-exec-border text-[11px] font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-[#111] transition-all font-inter"
                                >
                                    <span className="material-symbols-outlined text-sm">download</span> Descargar / Abrir
                                </a>
                            )}

                            <button
                                onClick={() => {
                                    setRenameValue(selectedItem.name);
                                    setItemToRename(selectedItem);
                                    setSelectedItem(null);
                                }}
                                className="flex items-center gap-4 w-full p-4 border border-exec-border text-[11px] font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-[#111] transition-all font-inter"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span> Renombrar
                            </button>

                            <button
                                onClick={() => {
                                    setItemToDelete(selectedItem);
                                    setSelectedItem(null);
                                }}
                                className="flex items-center gap-4 w-full p-4 bg-red-500/5 border border-red-500/20 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all font-inter"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Folder Modal */}
            {isCreateModalOpen && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-8 w-full max-w-md shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-exec-border pb-4">
                            <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3 font-orbitron">
                                <span className="material-symbols-outlined text-exec-blue">create_new_folder</span>
                                Nueva Carpeta
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)}>
                                <span className="material-symbols-outlined text-gray-500 hover:text-white">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest font-inter">Nombre del Directorio</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="ESCRIBE EL NOMBRE..."
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                className="w-full bg-black border border-exec-border rounded-sm p-4 text-[11px] text-white focus:border-exec-blue outline-none transition-all uppercase tracking-widest font-bold font-inter"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-6 py-3 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors font-inter"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-8 py-3 bg-white text-black rounded-sm hover:bg-gray-200 transition-all text-[10px] font-black uppercase tracking-widest font-inter"
                            >
                                Crear Carpeta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {itemToRename && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
                >
                    <div className="bg-[#0A0A0A] border border-exec-border rounded-sm p-8 w-full max-w-md shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-exec-border pb-4">
                            <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3 font-orbitron">
                                <span className="material-symbols-outlined text-exec-blue">edit</span>
                                Renombrar Recurso
                            </h3>
                            <button onClick={() => setItemToRename(null)}>
                                <span className="material-symbols-outlined text-gray-500 hover:text-white">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest font-inter">Nuevo nombre del activo</label>
                            <input
                                autoFocus
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                className="w-full bg-black border border-exec-border rounded-sm p-4 text-[11px] text-white focus:border-exec-blue outline-none transition-all uppercase tracking-widest font-bold font-inter"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setItemToRename(null)}
                                className="px-6 py-3 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors font-inter"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRename}
                                className="px-8 py-3 bg-white text-black rounded-sm hover:bg-gray-200 transition-all text-[10px] font-black uppercase tracking-widest font-inter"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-black border border-red-500/30 rounded-sm p-10 w-full max-w-sm shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 text-center">
                        <div className="flex flex-col items-center gap-4 text-red-500">
                            <span className="material-symbols-outlined text-6xl">warning</span>
                            <h3 className="text-lg font-black uppercase tracking-[0.2em] font-orbitron">Eliminar Recurso</h3>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed uppercase tracking-widest font-bold font-inter">
                            Estás a punto de eliminar <span className="text-white">"{itemToDelete.name}"</span>.
                            {itemToDelete.type === 'folder' && " Esto eliminará también todo su contenido."}
                            <br /><br />
                            <span className="text-red-500/80">Esta acción es irreversible y táctica.</span>
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                className="w-full py-4 bg-red-600 text-white rounded-sm hover:bg-red-500 transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 font-inter"
                            >
                                CONFIRMAR ELIMINACIÓN
                            </button>
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="w-full py-3 text-gray-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors font-inter"
                            >
                                CANCELAR OPERACIÓN
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
