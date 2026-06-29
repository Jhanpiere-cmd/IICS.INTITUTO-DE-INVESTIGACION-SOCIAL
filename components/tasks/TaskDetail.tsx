import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Upload, Send, CheckCircle, Clock, AlertTriangle, FileText, Link as LinkIcon, Calendar, User as UserIcon, Edit2, Trash2, Download, Eye, Image as ImageIcon, Bolt } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { User, TaskPriority } from '../../types';

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  created_by: string;
  status: string;
  priority: string;
  due_date: string;
  due_time?: string;
  publication_date?: string;
  file_urls?: string[];
  link?: string;
  allowed_file_types?: string[];
  completion_message?: string;
  completion_files?: string[];
  completion_link?: string;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
  group_task_id?: string | null;
  collaborator_ids?: string[];
  collaborators?: { id: string; fullName: string; avatarUrl?: string }[];
  assignedUser?: { fullName: string; role: string; avatarUrl?: string };
  createdByUser?: { fullName: string; role: string; avatarUrl?: string };
};

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose, onTaskUpdated }) => {
  const { user } = useAuth();
  const [completionMessage, setCompletionMessage] = useState('');
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [completionLink, setCompletionLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [completedByUser, setCompletedByUser] = useState<{ fullName: string; role: string; avatarUrl?: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { showToast } = useToast();

  // IDs de todos los responsables seleccionados en modo edición
  const [editAssignees, setEditAssignees] = useState<string[]>(() => {
    const initial = [task.assigned_to, ...((task as any).collaborator_ids || [])];
    return Array.from(new Set(initial.filter(Boolean)));
  });

  const toggleAssignee = (id: string) => {
    setEditAssignees(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev // mínimo 1
        : [...prev, id]
    );
  };

  // Convierte cualquier formato de fecha a YYYY-MM-DD para el input HTML type="date"
  // SIN conversión de zona horaria (lee los componentes directamente)
  const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return '';
    // Si ya tiene formato YYYY-MM-DD, tomar solo los primeros 10 caracteres
    return dateStr.substring(0, 10);
  };

  // Muestra la fecha en formato d/M/YYYY SIN conversión de zona horaria
  // Evita el bug donde UTC->local resta un día en zonas UTC-5 (Perú)
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      // Tomar solo YYYY-MM-DD ignorando hora/zona
      const parts = dateStr.substring(0, 10).split('-');
      if (parts.length < 3) return dateStr;
      const [yyyy, mm, dd] = parts;
      return `${parseInt(dd)}/${parseInt(mm)}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description,
    due_date: formatDateForInput(task.due_date),
    due_time: (task as any).due_time || '',
    priority: task.priority,
    assigned_to: task.assigned_to,
    link: task.link || '',
    task_type: (task as any).task_type || '',
    publication_date: (task as any).publication_date ? formatDateForInput((task as any).publication_date) : '',
  });

  const isAssigned = user?.id === task.assigned_to || (task as any).collaborator_ids?.includes(user?.id);
  const isCreator = user?.id === task.created_by;

  useEffect(() => {
    const loadUserRole = async () => {
      if (!user?.id) return;
      const { data: userData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (userData?.role) {
        setUserRole(userData.role);
      }
    };

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, "fullName", role, "avatarUrl"')
        .order('"fullName"');
      if (data) setUsers(data);
    };

    loadUserRole();
    fetchUsers();
  }, [user?.id]);

  useEffect(() => {
    if (isEditMode) {
      // Parse platforms if task_type is Flyer
      const typeStr = (task as any).task_type || '';
      if (typeStr.startsWith('Flyer')) {
        const platforms: string[] = [];
        if (typeStr.includes('Facebook')) platforms.push('Facebook');
        if (typeStr.includes('Instagram')) platforms.push('Instagram');
        setSelectedPlatforms(platforms);
      }
    }
  }, [isEditMode, (task as any).task_type]);

  useEffect(() => {
    const loadCompletedByUser = async () => {
      if (task.completed_by && task.status === 'Completada') {
        const { data } = await supabase
          .from('profiles')
          .select('"fullName", role, "avatarUrl"')
          .eq('id', task.completed_by)
          .single();
        if (data) setCompletedByUser(data);
      }
    };
    loadCompletedByUser();
  }, [task.completed_by, task.status]);

  // Sync editForm when task prop changes
  useEffect(() => {
    setEditForm({
      title: task.title,
      description: task.description,
      due_date: formatDateForInput(task.due_date),
      due_time: (task as any).due_time || '',
      priority: task.priority,
      assigned_to: task.assigned_to,
      link: task.link || '',
      task_type: (task as any).task_type || '',
      publication_date: (task as any).publication_date ? formatDateForInput((task as any).publication_date) : '',
    });
  }, [task]);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const canEdit = ['Director', 'Subdirectora', 'Asesor', 'Secretaria', 'Jefa de Imagen'].includes(userRole);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'text-exec-red bg-exec-red/10 border border-exec-red/30';
      case 'Alta': return 'text-orange-400 bg-orange-400/10 border border-orange-400/30';
      case 'Media': return 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30';
      case 'Baja': return 'text-exec-green bg-exec-green/10 border border-exec-green/30';
      default: return 'text-gray-400 bg-gray-400/10 border border-gray-400/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada': return 'text-exec-green bg-exec-green/10 border border-exec-green/30';
      case 'En progreso': return 'text-exec-blue bg-exec-blue/10 border border-exec-blue/30';
      case 'En espera': return 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border border-gray-400/30';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      // Validar por extensiones permitidas en la tarea si existen
      const allowed = (task.allowed_file_types && task.allowed_file_types.length > 0)
        ? task.allowed_file_types.map((s) => s.toLowerCase())
        : ['png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx', 'txt'];
      const invalidFiles = selectedFiles.filter((file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return !allowed.includes(ext);
      });

      if (invalidFiles.length > 0) {
        setError(`Esta tarea permite: ${allowed.join(', ')}`);
        return;
      }

      setCompletionFiles([...completionFiles, ...selectedFiles]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setCompletionFiles(completionFiles.filter((_, i) => i !== index));
  };

  const uploadCompletionFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of completionFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}/completion/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleCompleteTask = async () => {
    if (!completionMessage && completionFiles.length === 0 && !completionLink) {
      setError('Debes escribir un mensaje, subir archivos o adjuntar un enlace para completar la tarea');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let fileUrls: string[] = [];

      if (completionFiles.length > 0) {
        fileUrls = await uploadCompletionFiles();
      }

      const completionPayload = {
        status: 'Completada',
        completion_message: completionMessage || null,
        completion_files: fileUrls.length > 0 ? fileUrls : null,
        completion_link: completionLink || null,
        completed_by: user?.id,
        completed_at: new Date().toISOString(),
      };

      // 1. Actualizar la tarea actual
      const { error: updateError } = await supabase
        .from('tasks')
        .update(completionPayload)
        .eq('id', task.id);

      if (updateError) throw updateError;

      // 2. Si es una tarea compartida (group_task_id), propagar la completación a las demás copias del grupo
      if ((task as any).group_task_id) {
        const { error: groupUpdateError } = await supabase
          .from('tasks')
          .update(completionPayload)
          .eq('group_task_id', (task as any).group_task_id)
          .neq('id', task.id)   // no volver a actualizar la que ya se actualizó
          .neq('status', 'Completada'); // no sobreescribir las que ya se completaron antes

        if (groupUpdateError) {
          console.warn('No se pudo propagar completación al grupo:', groupUpdateError);
          // No es crítico, continuamos
        }
      }

      // Autopublicar a Resources para visibilidad del equipo
      try {
        await supabase
          .from('resources')
          .insert({
            title: task.title,
            description: completionMessage || null,
            category: null,
            folder: task.id,
            file_urls: fileUrls.length > 0 ? fileUrls : null,
            link: completionLink || null,
            uploaded_by: user?.id || null,
            visibility: 'interno',
          });
      } catch (e) {
        // No bloquear la finalización si falla la publicación
        console.error('Error autopublicando recurso:', e);
      }

      // Copiar archivos a Storage: resources/tareas-completas/<taskId>/
      if (fileUrls.length > 0) {
        try {
          const folderPrefix = `tareas-completas/${task.id}/`;
          const resBucket = supabase.storage.from('resources');
          // Ensure folder placeholder
          await resBucket.upload(`${folderPrefix}.keep`, new Blob([''], { type: 'text/plain' }), { upsert: true });

          for (const url of fileUrls) {
            try {
              // Extract path from public URL (assumes format: .../storage/v1/object/public/tasks/...)
              const pathMatch = url.match(/\/storage\/v1\/object\/public\/tasks\/(.+)$/);
              if (pathMatch) {
                const sourcePath = pathMatch[1];
                const fileName = sourcePath.split('/').pop() || `archivo-${Date.now()}`;
                // Copy from tasks bucket to resources bucket
                const { data: downloadData, error: downloadError } = await supabase.storage.from('tasks').download(sourcePath);
                if (downloadError || !downloadData) {
                  console.error('Error descargando archivo de tasks:', downloadError);
                  continue;
                }
                await resBucket.upload(`${folderPrefix}${fileName}`, downloadData, { upsert: true });
              } else {
                // Fallback: fetch from URL
                const resp = await fetch(url);
                if (!resp.ok) continue;
                const blob = await resp.blob();
                const nameFromUrl = url.split('/').pop() || `archivo-${Date.now()}`;
                await resBucket.upload(`${folderPrefix}${nameFromUrl}`, blob, { upsert: true });
              }
            } catch (err) {
              console.error('Error copiando archivo a resources:', err);
            }
          }
        } catch (err) {
          console.error('Error preparando carpeta de resources:', err);
        }
      }

      onTaskUpdated();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error al completar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (updateError) throw updateError;

      onTaskUpdated();
    } catch (error: any) {
      setError(error.message || 'Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (taskId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    if (!newFiles.length) return [];
    
    for (const file of newFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(fileName, file);
      
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(fileName);
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const finalTaskType = editForm.task_type.startsWith('Flyer') && selectedPlatforms.length > 0
        ? `Flyer (${selectedPlatforms.join(', ')})`
        : editForm.task_type;

      let updatedFileUrls = task.file_urls || [];
      if (newFiles.length > 0) {
        const uploadedUrls = await uploadFiles(task.id);
        updatedFileUrls = [...updatedFileUrls, ...uploadedUrls];
      }

      const { data: updatedData, error: updateError } = await supabase
        .from('tasks')
        .update({
          title: editForm.title,
          description: editForm.description,
          due_date: editForm.due_date || null,
          due_time: editForm.due_time || null,
          priority: editForm.priority,
          assigned_to: editAssignees[0],  // primer seleccionado = responsable principal
          collaborator_ids: editAssignees.slice(1), // el resto = co-responsables
          link: editForm.link || null,
          task_type: finalTaskType,
          file_urls: updatedFileUrls,
          publication_date: editForm.publication_date || null,
        })
        .eq('id', task.id)
        .select();

      if (updateError) throw updateError;
      
      // [SYNC] Actualizar espejo en audiovisual_planning si existe
      const isAudiovisual = ['Flyer', 'Video', 'Cortos'].some(t => finalTaskType.includes(t));
      if (isAudiovisual) {
        await supabase
          .from('audiovisual_planning')
          .update({
            title: editForm.title,
            description: editForm.description,
            target_date: editForm.due_date,
            assigned_to: editForm.assigned_to,
            category: selectedPlatforms.join(','),
            content_type: finalTaskType.includes('Video') || finalTaskType.includes('Cortos') ? 'video' : 'flyer'
          })
          .eq('task_id', task.id);
      }

      setIsEditMode(false);
      setNewFiles([]);
      onTaskUpdated();
    } catch (error: any) {
      setError(error.message || 'Error al actualizar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => setIsDeleteModalOpen(true);

  const handleDelete = async () => {
    setIsDeleteModalOpen(false);

    setLoading(true);
    setError(''); // Limpiar errores previos

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (deleteError) {
        console.error('Error eliminando tarea:', deleteError);

        // Mensajes específicos según el tipo de error
        if (deleteError.code === 'PGRST301' || deleteError.code === '42501') {
          throw new Error('No tienes permisos para eliminar esta tarea. Solo el creador o usuarios autorizados pueden eliminarla.');
        }

        if (deleteError.message.includes('violates foreign key constraint')) {
          throw new Error('No se puede eliminar esta tarea porque tiene registros relacionados en otros módulos (ej: Audiovisual, Comentarios). Primero desvincula la tarea o elimina esos registros.');
        }

        throw new Error(deleteError.message || 'Error al eliminar la tarea');
      }

      // [SYNC] Eliminar espejo en audiovisual_planning si existe
      await supabase.from('audiovisual_planning').delete().eq('task_id', task.id);

      // Éxito - cerrar modal y actualizar lista
      onTaskUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error al eliminar tarea:', error);
      const errorMsg = error.message || 'Error al eliminar la tarea. Por favor verifica tus permisos e intenta nuevamente.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getFileExtension = (url: string) => {
    const parts = url.split('.');
    return parts[parts.length - 1].toLowerCase();
  };

  const isImageFile = (url: string) => {
    const ext = getFileExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const isPDFFile = (url: string) => {
    return getFileExtension(url) === 'pdf';
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  };

  const handleDownloadFile = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = getFileName(url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'hace un momento';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`;
    return date.toLocaleDateString('es-ES');
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 pb-24 sm:pb-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#050505] rounded-xl max-w-4xl w-full max-h-[88vh] sm:max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Premium Stitch */}
        <div className="sticky top-0 bg-[#0D0D0D] z-20 p-6 border-b border-exec-border">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-sm text-[9px] sm:text-[8px] font-black uppercase tracking-[0.2em] ${getPriorityColor(isEditMode ? editForm.priority : task.priority)} shadow-sm`}>
                  Prioridad {isEditMode ? editForm.priority : task.priority}
                </span>
                <span className={`px-2 py-0.5 rounded-sm text-[9px] sm:text-[8px] font-black uppercase tracking-[0.2em] bg-[#171717] border border-exec-border text-gray-400 shadow-sm`}>
                  ID: {task.id.slice(0, 8)}
                </span>
                <span className={`px-2 py-0.5 rounded-sm text-[9px] sm:text-[8px] font-black uppercase tracking-[0.2em] ${getStatusColor(task.status)} shadow-sm`}>
                  {task.status}
                </span>
              </div>
              {isEditMode ? (
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-black/40 border border-exec-blue/30 rounded-sm px-4 py-3 text-base sm:text-lg font-black text-white outline-none focus:border-exec-blue shadow-[0_0_15px_rgba(59,130,246,0.05)] transition-all placeholder:text-gray-700"
                  placeholder="Título de la tarea..."
                />
              ) : (
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tighter">
                  {task.title}
                </h2>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-[#171717] rounded-sm text-gray-500 hover:text-white transition-all border border-exec-border sm:border-transparent bg-[#111] sm:bg-transparent"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#0A0A0A] pb-20">
          {error && (
            <div className="bg-exec-red/10 border border-exec-red/30 rounded-sm p-4 flex items-start gap-3 animate-shake">
              <AlertTriangle className="w-5 h-5 text-exec-red flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-exec-red uppercase tracking-wide">{error}</p>
            </div>
          )}

          {/* Grid de Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ─── RESPONSABLES (unificado: tarea solo o compartida) ─── */}
            {(() => {
              // Construir la lista completa de todos los responsables
              const allResponsibles = [
                ...(task.assignedUser
                  ? [{ id: task.assigned_to, fullName: task.assignedUser.fullName, role: task.assignedUser.role, avatarUrl: task.assignedUser.avatarUrl }]
                  : []),
                ...((task as any).collaborators || []),
              ];
              const isShared = allResponsibles.length > 1;

              return (
                <div className={`p-4 bg-[#0D0D0D] rounded-sm space-y-3 ${isShared ? 'md:col-span-2 lg:col-span-2' : ''}`}>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-exec-blue" />
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                      {isShared ? 'Responsables' : 'Responsable'}
                    </span>
                    {isShared && (
                      <span className="px-1.5 py-0.5 bg-exec-blue/10 border border-exec-blue/20 text-[8px] font-black text-exec-blue rounded-sm">
                        {allResponsibles.length} personas
                      </span>
                    )}
                  </div>

                  {isEditMode ? (
                    /* Modo edición: picker visual de avatares */
                    <div className="space-y-2">
                      <p className="text-[8px] text-gray-600 uppercase font-bold tracking-wider">
                        Selecciona uno o varios responsables
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {users.map((u: any) => {
                          const isSelected = editAssignees.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleAssignee(u.id)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border transition-all duration-200 ${
                                isSelected
                                  ? 'bg-exec-blue/15 border-exec-blue text-white shadow-[0_0_8px_rgba(0,136,255,0.2)]'
                                  : 'bg-black/30 border-exec-border/40 text-gray-500 hover:border-exec-border hover:text-gray-300'
                              }`}
                            >
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt=""
                                  className={`w-6 h-6 rounded-full object-cover border flex-shrink-0 transition-all ${
                                    isSelected ? 'border-exec-blue' : 'border-exec-border opacity-60'
                                  }`}
                                />
                              ) : (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
                                  isSelected
                                    ? 'bg-exec-blue/20 border-exec-blue'
                                    : 'bg-[#1a1a1a] border-exec-border/50'
                                }`}>
                                  <span className={`text-[8px] font-black ${
                                    isSelected ? 'text-exec-blue' : 'text-gray-600'
                                  }`}>
                                    {u.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[120px]">
                                {u.fullName?.split(' ').slice(0, 2).join(' ')}
                              </span>
                              {isSelected && (
                                <span className="material-symbols-outlined notranslate text-[12px] text-exec-blue flex-shrink-0" translate="no">check</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[8px] text-exec-blue/60 italic">
                        {editAssignees.length} persona{editAssignees.length !== 1 ? 's' : ''} seleccionada{editAssignees.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : isShared ? (
                    /* Tarea compartida: todos en chips iguales — 2 columnas */
                    <div className="grid grid-cols-2 gap-2">
                      {allResponsibles.map((person) => (
                        <div key={person.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-black/40 border border-exec-border/60 rounded-sm min-w-0">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-exec-border flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[8px] font-black text-exec-blue">
                                {person.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{person.fullName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Tarea individual: vista compacta clásica */
                    <div className="flex items-center gap-3">
                      {task.assignedUser?.avatarUrl ? (
                        <img src={task.assignedUser.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-exec-border shadow-sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-exec-blue/10 border border-exec-blue/20 flex items-center justify-center">
                          <span className="text-[10px] font-black text-exec-blue">
                            {task.assignedUser?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-tight">{task.assignedUser?.fullName}</p>
                        <p className="text-[8px] text-gray-600 font-black uppercase">{task.assignedUser?.role}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="p-4 bg-[#0D0D0D] rounded-sm space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-exec-blue" />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Categoría</span>
              </div>
              {isEditMode ? (
                <div className="space-y-2">
                  <div className="exec-select-container">
                    <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]" translate="no">category</span>
                    <select
                      value={editForm.task_type.split(' (')[0]}
                      onChange={(e) => setEditForm({ ...editForm, task_type: e.target.value })}
                      className="w-full bg-black border border-exec-border rounded-sm pl-10 pr-3 py-2 text-base sm:text-[10px] font-bold text-white outline-none focus:border-exec-blue/50 appearance-none"
                    >
                      <option value="Documento">Documento</option>
                      <option value="Oficio">Oficio / PDF</option>
                      <option value="Flyer">Diseño Flyer</option>
                      <option value="Video">Video Youtube</option>
                      <option value="Cortos">Shorts / Reels</option>
                    </select>
                  </div>
                  {editForm.task_type.startsWith('Flyer') && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlatforms(prev => prev.includes('Facebook') ? prev.filter(p => p !== 'Facebook') : [...prev, 'Facebook'])}
                        className={`flex-1 py-1 px-2 border rounded-sm text-[8px] font-black transition-all ${selectedPlatforms.includes('Facebook') ? 'bg-exec-blue border-exec-blue text-white' : 'border-[#262626] text-gray-600 hover:border-gray-500'}`}
                      >
                        FACEBOOK
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlatforms(prev => prev.includes('Instagram') ? prev.filter(p => p !== 'Instagram') : [...prev, 'Instagram'])}
                        className={`flex-1 py-1 px-2 border rounded-sm text-[8px] font-black transition-all ${selectedPlatforms.includes('Instagram') ? 'bg-exec-blue border-exec-blue text-white' : 'border-[#262626] text-gray-600 hover:border-gray-500'}`}
                      >
                        INSTAGRAM
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs font-black text-white uppercase tracking-tight">{task.task_type}</p>
              )}
            </div>

            {/* Fecha Límite */}
            <div className="p-4 bg-[#0D0D0D] rounded-sm space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-exec-blue" />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Entrega</span>
              </div>
              {isEditMode ? (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="w-full bg-black border border-exec-border rounded-sm px-3 py-2 text-base sm:text-[10px] font-bold text-white outline-none focus:border-exec-blue/50 [&::-webkit-calendar-picker-indicator]:invert"
                  />
                  <input
                    type="time"
                    value={editForm.due_time}
                    onChange={(e) => setEditForm({ ...editForm, due_time: e.target.value })}
                    className="w-full bg-black border border-exec-border rounded-sm px-3 py-2 text-base sm:text-[10px] font-bold text-white outline-none focus:border-exec-blue/50 [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              ) : (
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">{formatDateDisplay(task.due_date)}</p>
                  <p className="text-[8px] text-gray-600 font-black uppercase italic">{task.due_time || '--:--'}</p>
                </div>
              )}
            </div>

            {/* Fecha Publicación (Estratégico) */}
            <div className="p-4 bg-[#0D0D0D] rounded-sm space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-exec-blue" />
                <span className="text-[9px] font-bold text-exec-blue uppercase tracking-widest">Publicación</span>
              </div>
              {isEditMode ? (
                <input
                  type="date"
                  value={editForm.publication_date}
                  onChange={(e) => setEditForm({ ...editForm, publication_date: e.target.value })}
                  className="w-full bg-black border border-exec-blue/30 rounded-sm px-3 py-2 text-base sm:text-[10px] font-bold text-white outline-none focus:border-exec-blue/50 [&::-webkit-calendar-picker-indicator]:invert"
                />
              ) : (
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  {task.publication_date ? formatDateDisplay(task.publication_date) : 'SIN PROGRAMAR'}
                </p>
              )}
            </div>


            {/* Creada */}
            <div className="p-4 bg-[#0D0D0D] rounded-sm space-y-3">
              <div className="flex items-center gap-2">
                {isEditMode ? <Bolt className="w-3.5 h-3.5 text-exec-blue" /> : <Clock className="w-3.5 h-3.5 text-exec-blue" />}
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{isEditMode ? 'Prioridad' : 'Creada'}</span>
              </div>
              {isEditMode ? (
                <div className="exec-select-container">
                  <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]" translate="no">bolt</span>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                    className="w-full bg-black border border-exec-border rounded-sm pl-10 pr-3 py-2 text-base sm:text-[10px] font-bold text-white outline-none focus:border-exec-blue/50 appearance-none"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {task.createdByUser?.avatarUrl ? (
                    <img src={task.createdByUser.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-exec-border opacity-60" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#171717] border border-exec-border flex items-center justify-center">
                      <span className="text-[10px] font-black text-gray-500">
                        {task.createdByUser?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">{formatDateDisplay(task.created_at)}</p>
                    <p className="text-[8px] text-gray-600 font-black uppercase">{task.createdByUser?.fullName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-exec-blue rounded-sm"></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Descripción Operativa</h3>
            </div>
            {isEditMode ? (
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full bg-black/40 border border-exec-border rounded-sm px-4 py-4 text-base sm:text-xs text-gray-300 min-h-[150px] resize-none outline-none focus:border-exec-blue/50 transition-all font-['Outfit']"
                placeholder="Detalle los requerimientos operativos..."
              />
            ) : (
              <div className="bg-[#0D0D0D] border border-exec-border p-5 rounded-sm relative group">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FileText className="w-4 h-4 text-exec-blue/20" />
                </div>
                <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed font-['Inter']">{task.description}</p>
              </div>
            )}
          </div>

          {/* Enlace de Referencia */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-exec-blue rounded-sm"></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Enlace de Referencia</h3>
            </div>
            {isEditMode ? (
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="url"
                  value={editForm.link}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  className="w-full bg-black/40 border border-exec-border rounded-sm pl-12 pr-4 py-3 text-base sm:text-xs text-exec-blue outline-none focus:border-exec-blue/50 transition-all"
                  placeholder="https://..."
                />
              </div>
            ) : (
              task.link && (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-[#0D0D0D] border border-exec-border rounded-sm group hover:border-exec-blue/50 transition-all"
                >
                  <div className="w-8 h-8 rounded-sm bg-exec-blue/10 flex items-center justify-center group-hover:bg-exec-blue/20 transition-all">
                    <LinkIcon className="w-4 h-4 text-exec-blue" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 hover:text-exec-blue transition-colors truncate uppercase tracking-tighter">{task.link}</span>
                </a>
              )
            )}
          </div>

          {/* Documentación Adjunta */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-exec-blue rounded-sm"></div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Recursos y Archivos</h3>
            </div>
            {isEditMode ? (
              <div className="space-y-4">
                {/* Archivos Existentes */}
                {task.file_urls && task.file_urls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {task.file_urls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#0D0D0D] border border-exec-border rounded-sm">
                        <div className="flex items-center gap-3 truncate">
                          <FileText className="w-4 h-4 text-exec-blue" />
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate">Recurso actual {idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Cargador de Archivos Stitch */}
                <div className="relative group">
                  <input
                    type="file"
                    onChange={handleNewFileChange}
                    multiple
                    className="hidden"
                    id="new-file-upload-edit"
                  />
                  <label 
                    htmlFor="new-file-upload-edit"
                    className="flex flex-col items-center justify-center p-8 border border-dashed border-[#262626] bg-black/20 rounded-sm cursor-pointer hover:border-exec-blue/50 hover:bg-exec-blue/[0.02] transition-all"
                  >
                    <Upload className="w-6 h-6 text-gray-600 group-hover:text-exec-blue transition-all mb-3" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-gray-300">Cargar Documentación</span>
                  </label>
                </div>
                {/* Nuevos archivos seleccionados */}
                {newFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {newFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-exec-blue/5 border border-exec-blue/20 rounded-sm">
                        <span className="text-[9px] font-black text-exec-blue uppercase tracking-tight truncate flex-1">{file.name}</span>
                        <button type="button" onClick={() => removeNewFile(idx)} className="ml-2 text-exec-red/60 hover:text-exec-red p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {task.file_urls && task.file_urls.length > 0 ? (
                  task.file_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-[#0D0D0D] border border-exec-border rounded-sm hover:border-exec-blue transition-all group shadow-sm hover:shadow-exec-blue/5"
                    >
                      <div className="w-8 h-8 rounded-sm bg-[#171717] border border-exec-border flex items-center justify-center group-hover:border-exec-blue/30">
                        <FileText className="w-4 h-4 text-gray-500 group-hover:text-exec-blue" />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 group-hover:text-gray-300 uppercase tracking-[0.15em] truncate">Doc {index + 1}</span>
                    </a>
                  ))
                ) : (
                  <div className="col-span-2 p-8 border border-exec-border rounded-sm bg-black/20 flex flex-col items-center justify-center opacity-50">
                    <FileText className="w-6 h-6 text-gray-700 mb-2" />
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Sin adjuntos operativos</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gestión de Estado */}
          {(isAssigned || isCreator) && task.status !== 'Completada' && !isEditMode && (
            <div className="space-y-4 pt-4 border-t border-[#171717]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-exec-blue rounded-sm"></div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Gestión de Estado</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.status !== 'En progreso' && (
                  <button
                    onClick={() => handleUpdateStatus('En progreso')}
                    disabled={loading}
                    className="px-4 py-2 bg-exec-blue/10 border border-exec-blue/30 text-exec-blue text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-exec-blue hover:text-white transition-all disabled:opacity-50"
                  >
                    Marcar En Progreso
                  </button>
                )}
                {task.status !== 'En espera' && (
                  <button
                    onClick={() => handleUpdateStatus('En espera')}
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
                  >
                    Marcar En Espera
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panel de Completación Stitch */}
          {isAssigned && task.status !== 'Completada' && !isEditMode && (
            <div className="bg-[#0D0D0D] border border-exec-green/20 rounded-sm p-6 space-y-6 mt-8 shadow-[0_0_30px_rgba(16,185,129,0.03)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-exec-green/10 flex items-center justify-center border border-exec-green/30">
                  <CheckCircle className="w-5 h-5 text-exec-green" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Finalizar Entrega</h3>
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">Complete los detalles para cerrar la asignación</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Resumen de Ejecución</label>
                  <textarea
                    value={completionMessage}
                    onChange={(e) => setCompletionMessage(e.target.value)}
                    className="w-full bg-black/40 border border-[#262626] rounded-sm px-4 py-3 text-base sm:text-xs text-gray-300 min-h-[100px] resize-none outline-none focus:border-exec-green/50 transition-all"
                    placeholder="Describa el resultado de la tarea..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Link de Entrega final</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                    <input
                      type="url"
                      value={completionLink}
                      onChange={(e) => setCompletionLink(e.target.value)}
                      className="w-full bg-black/40 border border-[#262626] rounded-sm pl-12 pr-4 py-3 text-base sm:text-xs text-exec-green outline-none focus:border-exec-green/50 transition-all font-mono"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Archivos de Evidencia</label>
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      multiple
                      className="hidden"
                      id="completion-file-upload-stitch"
                    />
                    <label 
                      htmlFor="completion-file-upload-stitch"
                      className="flex items-center justify-center gap-3 p-4 border border-[#262626] bg-black/20 rounded-sm cursor-pointer hover:border-exec-green/50 transition-all"
                    >
                      <Upload className="w-4 h-4 text-gray-600" />
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Adjuntar Archivos</span>
                    </label>
                  </div>
                  {completionFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {completionFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-exec-green/5 border border-exec-green/20 rounded-sm">
                          <span className="text-[8px] font-black text-exec-green uppercase tracking-tighter truncate max-w-[150px]">{file.name}</span>
                          <button type="button" onClick={() => removeFile(index)} className="text-exec-red/60 hover:text-exec-red"><X className="w-3 h-3"/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCompleteTask}
                  disabled={loading}
                  className="w-full py-4 bg-exec-green text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-sm hover:bg-green-600 shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? 'Procesando entrega...' : (
                    <>
                      <Send className="w-4 h-4" />
                      Confirmar Entrega
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Historial de Completación (Solo si está completada) */}
          {task.status === 'Completada' && (
            <div className="space-y-6 pt-6 animate-fadeIn">
              <div className="bg-exec-green/5 border border-exec-green/20 rounded-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CheckCircle className="w-24 h-24 text-exec-green" />
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-sm bg-exec-green flex items-center justify-center border border-white/20 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Tarea Entregada</h3>
                    <p className="text-[10px] font-bold text-exec-green uppercase tracking-widest">{task.completed_at ? formatDateDisplay(task.completed_at) : 'Sin fecha'}</p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  {completedByUser && (
                    <div className="flex items-center gap-4 p-4 bg-black/40 rounded-sm border border-[#262626]">
                      <img 
                        src={completedByUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(completedByUser.full_name)}&background=10b981&color=fff`} 
                        className="w-10 h-10 rounded-full border border-exec-green/50" 
                      />
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-tight">{completedByUser.full_name}</p>
                        <p className="text-[8px] text-gray-500 font-black uppercase">Responsable de Entrega</p>
                      </div>
                    </div>
                  )}

                  {task.completion_message && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mensaje de Cierre</p>
                      <div className="p-5 bg-black/40 border border-[#262626] rounded-sm italic">
                        <p className="text-xs text-gray-400 leading-relaxed">"{task.completion_message}"</p>
                      </div>
                    </div>
                  )}

                  {task.completion_link && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Link de Entrega</p>
                      <a href={task.completion_link} target="_blank" className="block p-4 bg-exec-green/5 border border-exec-green/20 rounded-sm text-xs font-bold text-exec-green hover:bg-exec-green/10 transition-all font-mono">
                        {task.completion_link}
                      </a>
                    </div>
                  )}

                  {task.completion_files && task.completion_files.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Archivos entregados ({task.completion_files.length})</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {task.completion_files.map((url, index) => (
                          <div key={index} className="bg-black/40 border border-[#262626] rounded-sm overflow-hidden group hover:border-exec-green/50 transition-colors">
                            <div className="h-32 bg-[#050505] flex items-center justify-center overflow-hidden">
                              {isImageFile(url) ? (
                                <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                              ) : (
                                <FileText className={`w-12 h-12 ${isPDFFile(url) ? 'text-exec-red' : 'text-exec-blue'} opacity-40 group-hover:opacity-100 transition-opacity`} />
                              )}
                            </div>
                            <div className="p-3 border-t border-[#262626] flex items-center justify-between">
                              <span className="text-[9px] font-black text-gray-500 uppercase truncate flex-1">{getFileName(url)}</span>
                              <div className="flex gap-2 ml-4">
                                <a href={url} target="_blank" className="p-1.5 hover:bg-exec-blue/10 rounded-sm text-exec-blue transition-colors"><Eye className="w-3.5 h-3.5"/></a>
                                <button onClick={() => handleDownloadFile(url)} className="p-1.5 hover:bg-exec-green/10 rounded-sm text-exec-green transition-colors"><Download className="w-3.5 h-3.5"/></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Unificado Stich */}
        <div className="sticky bottom-0 bg-[#0D0D0D] p-6 border-t border-exec-border flex gap-3 z-20">
          {isEditMode ? (
            <>
              <button
                onClick={() => setIsEditMode(false)}
                className="flex-1 py-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border border-[#262626] rounded-sm hover:bg-[#111] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-[2] py-4 text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.2em] bg-exec-blue border border-exec-blue/50 rounded-sm hover:bg-exec-blue/80 shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Sincronizando...' : 'Actualizar Tarea'}
              </button>
            </>
          ) : (
            <>
              {canEdit && task.status !== 'Completada' && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex-1 py-3 text-[10px] font-black text-exec-blue uppercase tracking-[0.2em] border border-exec-blue/30 rounded-sm hover:bg-exec-blue/5 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
              {canEdit && (
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 py-3 text-[10px] font-black text-exec-red uppercase tracking-[0.2em] border border-exec-red/30 rounded-sm hover:bg-exec-red/5 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              )}
              {!canEdit && (
                <button
                  onClick={onClose}
                  className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border border-[#262626] rounded-sm hover:bg-[#111] transition-all"
                >
                  Cerrar
                </button>
              )}
            </>
          )}
        </div>
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Confirmar Eliminación"
          message="¿Estás seguro de eliminar esta tarea? Esta acción no se puede deshacer y se perderán todos los archivos adjuntos."
          confirmText="Eliminar Tarea"
          variant="danger"
        />
      </div>
    </div>
  );
};
