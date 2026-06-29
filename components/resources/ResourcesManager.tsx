import React from 'react';
import { DriveExplorer } from '../secretary/DriveExplorer';

/**
 * ResourcesManager (Executive Unified Version)
 * 
 * Componente que gestiona la biblioteca de recursos utilizando el motor 
 * unificado DriveExplorer, configurado con metadatos de tareas.
 */
export const ResourcesManager: React.FC = () => {
    return (
        <div className="h-full bg-black">
            <DriveExplorer 
                bucketName="resources"
                moduleName="RECURSOS"
                title="Recursos del Sistema"
                subtitle="Gestión y administración de activos tácticos y compartidos."
                icon="folder_managed"
                showTaskMetadata={true}
                showEditorAction={false}
            />
        </div>
    );
};
