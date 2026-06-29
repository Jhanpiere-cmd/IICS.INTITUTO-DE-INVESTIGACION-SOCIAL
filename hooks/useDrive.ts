
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface DriveItem {
    name: string;
    id: string; // path or ID
    type: 'folder' | 'file';
    url?: string;
    size?: number;
    mimeType?: string;
    updatedAt?: string;
}

export const useDrive = (bucketName: string, initialPath: string = '') => {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [items, setItems] = useState<DriveItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const bucket = useMemo(() => supabase.storage.from(bucketName), [bucketName]);

    // Fetch items
    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await bucket.list(currentPath, {
                limit: 1000,
                sortBy: { column: 'name', order: 'asc' },
            });

            if (error) throw error;

            const driveItems: DriveItem[] = (data || [])
                .filter(item => item.name !== '.keep') // Hide placeholder
                .map(item => {
                    // Primitive check for folder: no metadata usually means folder in Supabase list().
                    // OR check if it has an extension? 
                    // Better: User `ResourcesManager` logic: !item.metadata
                    const isFolder = !item.metadata;

                    return {
                        name: item.name,
                        id: `${currentPath}${item.name}`,
                        type: isFolder ? 'folder' : 'file',
                        size: item.metadata?.size,
                        mimeType: item.metadata?.mimetype,
                        updatedAt: item.updated_at,
                        url: isFolder ? undefined : bucket.getPublicUrl(`${currentPath}${item.name}`).data.publicUrl
                    };
                });

            setItems(driveItems);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();

        // Subscribe to changes if possible (Storage doesn't always emit realtime without extra setup, but good to try)
        // For now, simpler to manual refresh or poll.
    }, [currentPath, bucket]);

    // Actions
    const createFolder = async (name: string) => {
        if (!name) return;
        const folderPath = `${currentPath}${name}/.keep`;
        await bucket.upload(folderPath, new Blob(['']), { upsert: false });
        await refresh();
    };

    const uploadFile = async (file: File) => {
        const filePath = `${currentPath}${file.name}`;
        await bucket.upload(filePath, file, { upsert: true });
        await refresh();
    };

    const deleteItem = async (item: DriveItem) => {
        if (item.type === 'file') {
            await bucket.remove([item.id]);
        } else {
            // Recursive delete for folder
            await deleteFolderRecursively(item.id);
        }
        await refresh();
    };

    const deleteFolderRecursively = async (path: string) => {
        // Ensure path ends with /
        const prefix = path.endsWith('/') ? path : `${path}/`;
        const { data } = await bucket.list(prefix);

        if (data) {
            const filesToDelete = [];
            for (const file of data) {
                if (!file.metadata) {
                    // Subfolder
                    await deleteFolderRecursively(`${prefix}${file.name}`);
                } else {
                    filesToDelete.push(`${prefix}${file.name}`);
                }
            }
            if (filesToDelete.length > 0) {
                await bucket.remove(filesToDelete);
            }
        }
        // Finally remove the folder itself (often implicitly handled by removing contents, but remove .keep if exists)
        await bucket.remove([`${prefix}.keep`]);
    };

    const moveItem = async (item: DriveItem, newParentPath: string) => {
        // "newParentPath" should end in / or be empty
        // Move = Copy + Delete
        if (item.type === 'file') {
            const from = item.id;
            const to = `${newParentPath}${item.name}`;
            await bucket.move(from, to);
        } else {
            // Move folder (Hard!)
            // We need to list all files in folder, move them to new path, recurse.
            alert("Mover carpetas aún no está soportado completamente (requiere mover cada archivo). Por favor cree la carpeta destino y mueva los archivos.");
            return;
        }
        await refresh();
    };

    const renameItem = async (item: DriveItem, newName: string) => {
        const pathParts = item.id.split('/');
        pathParts.pop(); // remove old name
        const basePath = pathParts.join('/') + (pathParts.length > 0 ? '/' : '');

        if (item.type === 'file') {
            await bucket.move(item.id, `${basePath}${newName}`);
        } else {
            // Rename folder... difficult in S3-like.
            alert("Renombrar carpetas es complejo (requiere mover todos los archivos).");
            return;
        }
        await refresh();
    };

    const navigate = (folderName: string) => {
        setCurrentPath(prev => `${prev}${folderName}/`);
    };

    const navigateTo = (path: string) => {
        setCurrentPath(path);
    };

    const navigateUp = () => {
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length ? `${parts.join('/')}/` : '');
    };

    return {
        currentPath,
        items,
        loading,
        loadingError: error,
        actions: {
            refresh,
            createFolder,
            uploadFile,
            deleteItem,
            moveItem,
            renameItem,
            navigate,
            navigateUp,
            navigateTo
        }
    };
};
