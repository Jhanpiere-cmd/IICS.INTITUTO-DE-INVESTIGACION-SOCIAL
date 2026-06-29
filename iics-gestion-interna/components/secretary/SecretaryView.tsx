import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DriveExplorer } from './DriveExplorer';
import { DocumentEditor } from './DocumentEditor';

export const SecretaryView: React.FC = () => {
    const { user } = useAuth();
    const [viewState, setViewState] = useState<'explorer' | 'editor'>('explorer');
    const [activeFolder, setActiveFolder] = useState<string>('General');
    const [currentFile, setCurrentFile] = useState<any>(null);

    const handleOpenFile = (file: any) => {
        // En el futuro, podríamos abrir archivos específicos en el editor si son editables
        console.log("Opening file", file);
    };

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden relative">
            {/* 
              Delegamos la cabecera al motor DriveExplorer cuando estamos en modo explorador.
              Cuando estamos en modo editor, el DocumentEditor tiene su propia barra superior profesional.
            */}
            <main className="flex-1 overflow-hidden relative z-10">
                {viewState === 'explorer' ? (
                    <DriveExplorer
                        bucketName="resources"
                        initialPath=""
                        onOpenFile={handleOpenFile}
                        title="Gestión Documental"
                        subtitle="Almacenamiento y administración centralizada de activos."
                        moduleName="SECRETARÍA"
                        icon="inventory_2"
                        showEditorAction={true}
                        onEditorClick={(path) => {
                            setActiveFolder(path || 'General');
                            setViewState('editor');
                        }}
                        showTaskMetadata={true} // Unificado: Ahora muestra quién completó la tarea vinculada
                    />
                ) : (
                    <DocumentEditor
                        onClose={() => setViewState('explorer')}
                        folderName={activeFolder}
                    />
                )}
            </main>
        </div>
    );
};
