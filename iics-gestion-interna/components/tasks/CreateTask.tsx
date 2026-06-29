import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, TaskPriority } from '../../types';
import { X, Plus, Upload, Link as LinkIcon, Calendar, Clock, User as UserIcon, AlertCircle, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { extractTaskEntities } from '../../lib/ai';



export interface TaskFormData {
  title: string;
  description: string;
  assignedToIds: string[];
  priority: TaskPriority;
  dueDate: string;
  dueTime?: string;
  link: string;
  publicationDate?: string;
  taskType?: 'Oficio' | 'Flyer' | 'Video' | 'Documento' | 'Cortos';
}

interface CreateTaskProps {
  onClose: () => void;
  onTaskCreated: (taskId?: string) => void;
  initialDueDate?: string;
  initialData?: Partial<TaskFormData>;
  allowedTypes?: ('Oficio' | 'Flyer' | 'Video' | 'Documento' | 'Cortos')[];
  taskId?: string;
  groupTaskId?: string;
  planningId?: string;
}

export const CreateTask: React.FC<CreateTaskProps> = ({ onClose, onTaskCreated, initialDueDate, initialData, allowedTypes, taskId, groupTaskId, planningId }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    assignedToIds: initialData?.assignedToIds || [],
    priority: initialData?.priority || 'Media' as TaskPriority,
    dueDate: initialData?.dueDate || initialDueDate || '',
    dueTime: initialData?.dueTime || '',
    link: initialData?.link || '',
    publicationDate: (initialData as any)?.publicationDate || '',
  });

  const [magicPrompt, setMagicPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const handleMagicExtract = async () => {
    if (!magicPrompt.trim()) return;
    setIsExtracting(true);
    try {
      const result = await extractTaskEntities(
        magicPrompt, 
        users, 
        new Date().toISOString().split('T')[0]
      );
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          title: result.title || prev.title,
          description: result.description || prev.description,
          priority: result.priority || prev.priority,
          dueDate: result.dueDate || prev.dueDate,
          assignedToIds: result.assignedToId ? [result.assignedToId] : prev.assignedToIds
        }));
        
        // Mapeo flexible de tipos de IA a tipos de sistema
        const typeMapping: Record<string, 'Oficio' | 'Flyer' | 'Video' | 'Documento' | 'Cortos'> = {
          'Flyer': 'Flyer',
          'Cortos': 'Cortos',
          'Video': 'Video',
          'Documento': 'Documento',
          'Oficio': 'Oficio'
        };

        if (result.taskType && typeMapping[result.taskType]) {
          setTaskType(typeMapping[result.taskType]);
        }
        
        // Feedback visual o sonido podría ir aquí
      }
    } catch (err) {
      console.error('Magic extract error:', err);
      setError('No pude procesar el comando "Magic". Intenta de nuevo.');
    } finally {
      setIsExtracting(false);
    }
  };

  const isValidTaskType = (type: any): type is 'Oficio' | 'Flyer' | 'Video' | 'Documento' | 'Cortos' => {
    return ['Oficio', 'Flyer', 'Video', 'Documento', 'Cortos'].includes(type);
  };

  const [files, setFiles] = useState<File[]>([]);
  const [taskType, setTaskType] = useState<'Oficio' | 'Flyer' | 'Video' | 'Documento' | 'Cortos'>(
    isValidTaskType(initialData?.taskType) 
      ? initialData!.taskType 
      : (allowedTypes && allowedTypes.length > 0 ? allowedTypes[0] : 'Documento')
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const allowedPresets: Record<'Oficio' | 'Flyer' | 'Video' | 'Documento' | 'Cortos', string[]> = {
    Oficio: ['pdf', 'doc', 'docx'],
    Flyer: ['png', 'jpg', 'jpeg', 'pdf'],
    Video: ['mp4', 'mov'],
    Cortos: ['mp4', 'mov', 'png', 'jpg'],
    Documento: ['pdf', 'doc', 'docx', 'xlsx', 'pptx'],
  };

  const acceptForInput = () => {
    const presets = allowedPresets[taskType] || allowedPresets['Documento'];
    return '.' + presets.join(',.');
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, "fullName", role, avatar_url')
        .order('"fullName"');

      if (profilesError) throw profilesError;

      const mappedUsers: User[] = (profilesData || []).map((p: any) => ({
        id: p.id,
        email: p.email || '',
        fullName: p.fullName || 'Sin nombre',
        role: p.role || 'Miembro',
        status: 'Aprobado',
        avatarUrl: p.avatar_url,
        createdAt: new Date(),
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const allowed = allowedPresets[taskType];
      const invalidFiles = selectedFiles.filter((file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return !allowed.includes(ext);
      });

      if (invalidFiles.length > 0) {
        setError(`Tipo de tarea "${taskType}" permite: ${allowed.join(', ')}`);
        return;
      }

      setFiles([...files, ...selectedFiles]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async (taskId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title || !formData.description || formData.assignedToIds.length === 0 || !formData.dueDate) {
      setError('Todos los campos obligatorios deben ser completados');
      setLoading(false);
      return;
    }

    try {
      const finalTaskType = ['Flyer', 'Video', 'Cortos'].includes(taskType) && selectedPlatforms.length > 0
        ? `${taskType} (${selectedPlatforms.join(', ')})`
        : taskType;

      const mainAssignee = formData.assignedToIds[0];
      const collaborators = formData.assignedToIds.slice(1);

      const taskData = {
        title: formData.title,
        description: formData.description,
        assigned_to: mainAssignee,
        collaborator_ids: collaborators,
        created_by: user?.id,
        status: 'Pendiente',
        priority: formData.priority,
        due_date: formData.dueDate,
        due_time: formData.dueTime || null,
        link: formData.link || null,
        allowed_file_types: allowedPresets[taskType],
        task_type: finalTaskType,
        publication_date: formData.publicationDate || null,
      };

      let inserted;
      if (taskId || groupTaskId) {
        if (groupTaskId) {
          // Si es una tarea de grupo antigua, actualizamos todas (atavismo) o convertimos a single
          // Por ahora mantenemos compatibilidad actualizando el bloque
          const { error: updateError } = await supabase
            .from('tasks')
            .update(taskData)
            .eq('group_task_id', groupTaskId);
          if (updateError) throw updateError;
        } else if (taskId) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update(taskData)
            .eq('id', taskId);
          if (updateError) throw updateError;
        }

        if (planningId) {
          await supabase
            .from('audiovisual_planning')
            .update({
              title: formData.title,
              description: formData.description,
              target_date: formData.dueDate,
              collaborator_ids: collaborators
            })
            .eq('id', planningId);
        }
        inserted = [{ id: taskId || 'updated-group' }];
      } else {
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert([taskData])
          .select();
        if (insertError) throw insertError;
        inserted = data;
      }

      if (files.length > 0 && inserted && inserted.length > 0 && (taskId || !groupTaskId)) {
        // Subimos archivos solo para la tarea única (o la principal si es edición)
        const targetId = taskId || (inserted[0] as any).id;
        if (targetId !== 'updated-group') {
          const fileUrls = await uploadFiles(targetId);
          await supabase.from('tasks').update({ file_urls: fileUrls }).eq('id', targetId);
        }
      }

      if (inserted && inserted.length > 0) {
        // [SYNC] Si es una tarea audiovisual, crear/actualizar también en audiovisual_planning
        const isAudiovisual = ['Flyer', 'Video', 'Cortos'].some(t => taskType.includes(t));
        if (isAudiovisual && !groupTaskId) {
          const targetTaskId = (inserted[0] as any).id;
          const planningData = {
            title: formData.title,
            description: formData.description,
            target_date: formData.dueDate,
            assigned_to: mainAssignee,
            task_id: targetTaskId,
            category: selectedPlatforms.join(','),
            content_type: taskType.includes('Video') || taskType.includes('Cortos') ? 'video' : 'flyer',
            status: 'Planificado'
          };

          if (planningId) {
            await supabase.from('audiovisual_planning').update(planningData).eq('id', planningId);
          } else {
            // Verificar si ya existe un plan para esta tarea antes de insertar (para evitar duplicados en re-intentos)
            const { data: existingPlan } = await supabase
              .from('audiovisual_planning')
              .select('id')
              .eq('task_id', targetTaskId)
              .single();
            
            if (existingPlan) {
              await supabase.from('audiovisual_planning').update(planningData).eq('id', existingPlan.id);
            } else {
              await supabase.from('audiovisual_planning').insert([planningData]);
            }
          }
        }

        // Notificar a TODOS (Asignado principal + Colaboradores)
        const allTargetIds = formData.assignedToIds;
        const notifRows = allTargetIds.map((uid) => ({
          user_id: uid,
          type: 'task_assigned',
          title: 'Nueva tarea grupal',
          message: `${formData.title} · vence ${formData.dueDate}`,
          data: { task_id: (inserted![0] as any).id },
        }));
        await supabase.from('notifications').insert(notifRows);
      }

      onTaskCreated(inserted?.[0]?.id);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  const role = user?.role?.toLowerCase() || '';
  const canCreateTask =
    role.includes('director') ||
    role.includes('asesor') ||
    (role.includes('imagen') && role.includes('jefa')) ||
    role.includes('subdirector') ||
    role.includes('secretaria') ||
    role.includes('coordinador') ||
    role.includes('relaciones');

  if (!canCreateTask) {
     return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] rounded-sm p-6 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-exec-red mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">Acceso Denegado</h3>
            <p className="text-gray-400 mb-4">No tienes permisos para crear tareas.</p>
            <button onClick={onClose} className="exec-btn-primary w-full py-3">Cerrar</button>
          </div>
        </div>
     );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 overflow-y-auto">
      <div className="bg-[#050505] rounded-none max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col relative">
        <div className="flex items-center justify-between p-6 bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-exec-blue/10 flex items-center justify-center">
               <span className="material-symbols-outlined text-exec-blue text-2xl">add_task</span>
             </div>
             <div>
               <h2 className="text-xs font-bold text-white uppercase tracking-widest">{taskId || groupTaskId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
               <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Asignación Ejecutiva</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-[#1a1a1a] transition-all sm:border-transparent">
             <span className="material-symbols-outlined text-gray-400 text-xl">close</span>
          </button>
        </div>

        {/* Magic Assistant Input */}
        <div className="px-6 py-4 bg-[#050505]">
          <div className="relative group">
            <div className="relative flex items-center bg-black rounded-none overflow-hidden p-1">
              <div className="p-3 text-exec-blue">
                <Sparkles size={18} className={isExtracting ? 'animate-pulse' : ''} />
              </div>
              <input 
                type="text" 
                placeholder="IA: 'Tarea para Silvana el 11 de mayo sobre flyers...'"
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicExtract()}
                className="flex-1 bg-transparent border-none outline-none text-white text-[11px] py-2 px-1 placeholder:text-gray-700 font-medium"
              />
              <button 
                onClick={handleMagicExtract}
                disabled={isExtracting || !magicPrompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-none hover:bg-gray-100 disabled:opacity-50 transition-all mr-1 shadow-sm"
              >
                {isExtracting ? (
                  <Loader2 size={12} className="animate-spin text-exec-blue" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-exec-blue text-[16px]">smart_toy</span>
                    <span>Magia</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[8px] text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2 px-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-exec-blue animate-pulse"></span>
            HOYR Magic Engine v2.5
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 pb-10 overflow-y-auto custom-scrollbar">

          {error && (
            <div className="bg-exec-red/5 border border-exec-red/20 rounded-sm p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-exec-red flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-exec-red font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Título de la Tarea *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-[#0D0D0D] rounded-sm px-4 py-3 text-xs text-white placeholder:text-gray-700 outline-none focus:border-exec-blue/50 transition-all"
                placeholder="Ej: Diseñar flyer para evento"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Descripción *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full bg-[#0D0D0D] rounded-sm px-4 py-3 text-xs text-white placeholder:text-gray-700 outline-none focus:border-exec-blue/50 transition-all resize-none"
                placeholder="Describe los detalles de la tarea..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tipo de Producto *</label>
                <div className="exec-select-container relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">category</span>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as typeof taskType)}
                    className="w-full bg-[#0D0D0D] rounded-sm pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-exec-blue/50 transition-all appearance-none"
                    required
                  >
                    {(!allowedTypes || allowedTypes.includes('Documento')) && <option value="Documento">Documento General</option>}
                    {(!allowedTypes || allowedTypes.includes('Oficio')) && <option value="Oficio">Oficio / PDF</option>}
                    {(!allowedTypes || allowedTypes.includes('Flyer')) && <option value="Flyer">Diseño Flyer</option>}
                    {(!allowedTypes || allowedTypes.includes('Video')) && <option value="Video">Video Youtube</option>}
                    {(!allowedTypes || allowedTypes.includes('Cortos')) && <option value="Cortos">Shorts / Reels</option>}
                  </select>
                </div>
                {['Flyer', 'Video', 'Cortos'].includes(taskType) && (
                   <div className="mt-3 flex gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                     {['Facebook', 'Instagram', 'YouTube', 'Cortos'].map(p => (
                       <label key={p} className="flex items-center gap-2 cursor-pointer group">
                         <input
                           type="checkbox"
                           checked={selectedPlatforms.includes(p)}
                           onChange={(e) => {
                             const next = e.target.checked ? [...selectedPlatforms, p] : selectedPlatforms.filter(x => x !== p);
                             setSelectedPlatforms(next);
                           }}
                           className="w-3.5 h-3.5 bg-[#0D0D0D] border-none rounded-sm text-exec-blue focus:ring-0"
                         />
                         <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight group-hover:text-exec-blue transition-colors">{p}</span>
                       </label>
                     ))}
                   </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Prioridad *</label>
                <div className="exec-select-container relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">bolt</span>
                   <select
                     value={formData.priority}
                     onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                     className="w-full bg-[#0D0D0D] rounded-sm pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-exec-blue/50 transition-all appearance-none"
                     required
                   >
                     <option value="Baja">Baja</option>
                     <option value="Media">Media</option>
                     <option value="Alta">Alta</option>
                     <option value="Urgente">Urgente</option>
                   </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha Límite *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full bg-[#0D0D0D] rounded-sm pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-exec-blue/50 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                      required
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fecha Publicación</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-exec-blue" />
                    <input
                      type="date"
                      value={formData.publicationDate}
                      onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                      className="w-full bg-[#0D0D0D] rounded-sm pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-exec-blue/50 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Hora (Opcional)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="time"
                      value={formData.dueTime}
                      onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                      className="w-full bg-[#0D0D0D] rounded-sm pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-exec-blue/50 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Asignar Personal *</label>
              <div className="rounded-sm p-4 bg-[#0A0A0A] max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                {users.map((u) => {
                  const checked = formData.assignedToIds.includes(u.id);
                  return (
                    <label key={u.id} className={`flex items-center justify-between p-2 rounded-sm transition-all cursor-pointer ${checked ? 'bg-exec-blue/5' : 'bg-[#0D0D0D] hover:bg-[#111]'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                           {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold text-gray-500">{u.fullName.charAt(0)}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-white tracking-tight">{u.fullName}</span>
                      </div>
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 bg-[#0D0D0D] border-none rounded-sm text-exec-blue focus:ring-0"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked ? [...formData.assignedToIds, u.id] : formData.assignedToIds.filter(id => id !== u.id);
                          setFormData({ ...formData, assignedToIds: next });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Enlace de Referencia</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full bg-[#0D0D0D] rounded-sm pl-10 pr-4 py-3 text-xs text-white placeholder:text-gray-700 outline-none focus:border-exec-blue/50 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Documentación Adjunta</label>
              <div className="bg-[#0D0D0D] rounded-sm p-6 text-center hover:bg-[#111] transition-all group">
                <input type="file" onChange={handleFileChange} multiple accept={acceptForInput()} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-5 h-5 text-gray-500 mb-2 group-hover:text-exec-blue transition-all" />
                  <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Cargar Referencias</p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[#0D0D0D] rounded-sm">
                      <span className="text-[9px] font-bold text-gray-400 truncate flex-1">{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)} className="ml-2 text-exec-red/60 hover:text-exec-red"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-[10px] font-bold text-gray-400 rounded-sm hover:bg-[#0D0D0D] transition-all uppercase tracking-widest">Cancelar</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 text-[10px] font-bold text-white bg-exec-blue rounded-sm hover:bg-exec-blue/80 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> : <><Plus className="w-4 h-4" /><span>{taskId || groupTaskId ? 'Guardar Cambios' : 'Asignar Tarea'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
