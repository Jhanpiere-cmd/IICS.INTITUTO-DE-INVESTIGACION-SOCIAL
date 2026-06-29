import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { Users, Plus, Edit, Trash2, UserPlus, Shield, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  created_at: string;
  last_seen?: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string;
}

export const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tick, setTick] = useState(0);
  const [registrants, setRegistrants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'registrants'>('team');

  // Formulario nuevo usuario
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    role: '',
    password: ''
  });

  // Formulario nuevo rol
  const [newRole, setNewRole] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadUsers();
      loadCustomRoles();
    }
  }, [user]);

  // Forzar re-renderizado de los textos "hace X min" cada minuto
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Suscripción en tiempo real para cambios en perfiles (presencia)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profiles-presence-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const updatedProfile = payload.new as any;
          setUsers(prev => prev.map(u => 
            u.id === updatedProfile.id 
              ? { 
                  ...u, 
                  fullName: updatedProfile.fullName || u.fullName,
                  avatarUrl: updatedProfile.avatarUrl || u.avatarUrl,
                  role: updatedProfile.role || u.role,
                  last_seen: updatedProfile.last_seen 
                } 
              : u
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // 1. Fetch all user data from 'profiles' table (Unified source)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, "fullName", email, role, "avatarUrl", updated_at, last_seen')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      const mappedUsers = (profilesData || []).map((p: any) => ({
        id: p.id,
        fullName: p.fullName || 'Sin nombre',
        email: p.email,
        role: p.role,
        avatarUrl: p.avatarUrl,
        created_at: p.updated_at,
        last_seen: p.last_seen
      }));

      setUsers(mappedUsers);

      // 2. Fetch all event participants (Observatory registrations)
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id, full_name, email, phone, institution, category, registered_at,
          events:events(title)
        `)
        .order('registered_at', { ascending: false });

      if (!participantsError && participantsData) {
        setRegistrants(participantsData.map((p: any) => ({
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          phone: p.phone,
          institution: p.institution || 'Sin institución',
          category: p.category,
          registered_at: p.registered_at,
          eventTitle: p.events?.title || 'Evento General'
        })));
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showToast({ type: 'error', title: 'ERROR DE CARGA', message: 'No se pudieron recuperar los perfiles del equipo.' });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.role || !newUser.password) {
      showToast({ type: 'error', title: 'CAMPOS INCOMPLETOS', message: 'Por favor completa todos los datos estratégicos.' });
      return;
    }

    if (newUser.password.length < 6) {
      showToast({ type: 'error', title: 'CONTRASEÑA DÉBIL', message: 'La clave de acceso debe tener al menos 6 caracteres.' });
      return;
    }

    try {
      // Verificar si el email ya existe en profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUser.email)
        .single();

      if (existingUser) {
        showToast({ type: 'error', title: 'USUARIO EXISTENTE', message: 'Ya existe un miembro registrado con este correo institucional.' });
        return;
      }

      // 1. Crear cliente temporal para no cerrar sesión del administrador
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      });

      // 1.5 Pre-autorizar email para aprobación inmediata en el trigger
      await supabase
        .from('authorized_emails')
        .upsert({ email: newUser.email });

      // 2. Crear usuario en Auth (enviará correo de confirmación)
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
            role: newUser.role
          }
        }
      });

      if (authError) {
        throw authError; // El error ya es descriptivo (ej: contraseña débil, email inválido)
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 3. Crear el perfil inicial en public.profiles (Autoritativo)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: newUser.email,
          "fullName": newUser.fullName,
          role: newUser.role,
          status: 'Aprobado'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      showToast({
        type: 'success',
        title: 'USUARIO CREADO',
        message: `Miembro ${newUser.fullName} agregado correctamente al sistema.`,
        duration: 5000
      });

      setNewUser({ fullName: '', email: '', role: '', password: '' });
      setShowAddUser(false);

      // Esperar un poco para que el trigger termine si es necesario
      setTimeout(async () => {
        await loadUsers();
      }, 1000);

    } catch (error: any) {
      console.error('Error creating user:', error);
      showToast({ 
        type: 'error', 
        title: 'Error de Creación',
        message: error.message || 'Error al crear usuario' 
      });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      showToast({ type: 'success', title: 'ROL ACTUALIZADO', message: 'El cargo ejecutivo ha sido modificado exitosamente.' });
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      showToast({ type: 'error', title: 'ERROR DE ACTUALIZACIÓN', message: 'No se pudo modificar el cargo en este momento.' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const isConfirmed = await confirm(
      'ELIMINAR MIEMBRO',
      `¿Estás seguro de eliminar al usuario "${userName}"? Esta acción no se puede deshacer y revocará todos sus accesos estratégicos.`,
      { 
        confirmText: 'ELIMINAR PERFIL',
        isDestructive: true 
      }
    );

    if (!isConfirmed) return;

    try {
      setLoading(true); // Mostrar carga mientras elimina

      // Llamar a la función RPC segura en la base de datos
      const { error } = await supabase.rpc('delete_user_by_admin', {
        user_id: userId
      });

      if (error) throw error;

      showToast({ type: 'success', title: 'USUARIO ELIMINADO', message: `El perfil de ${userName} ha sido revocado permanentemente.` });

      // Recargar la lista para reflejar cambios
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      // Mostrar mensaje detallado si viene de la base de datos
      showToast({
        type: 'error',
        title: 'ERROR DE ELIMINACIÓN',
        message: error.message || 'El perfil no pudo ser eliminado por registros asociados.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRegistrant = async (registrantId: string) => {
    const isConfirmed = await confirm(
      'ELIMINAR REGISTRO',
      '¿Estás seguro de eliminar este registro del observatorio? Esta acción no se puede deshacer.',
      { 
        confirmText: 'ELIMINAR',
        isDestructive: true 
      }
    );

    if (!isConfirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('id', registrantId);

      if (error) throw error;

      showToast({ type: 'success', title: 'REGISTRO ELIMINADO', message: 'El participante ha sido removido con éxito.' });
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting participant:', error);
      showToast({ type: 'error', title: 'ERROR', message: 'No se pudo eliminar al participante.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name) {
      showToast({ type: 'error', title: 'CAMPO OBLIGATORIO', message: 'El nombre del rol estratégico es necesario.' });
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_roles')
        .insert({
          name: newRole.name,
          description: newRole.description,
          created_by: user?.id
        });

      if (error) throw error;

      showToast({ type: 'success', title: 'ROL CREADO', message: `Configuración de "${newRole.name}" activada correctamente.` });
      setNewRole({ name: '', description: '' });
      await loadCustomRoles();
    } catch (error: any) {
      console.error('Error creating role:', error);
      showToast({ type: 'error', title: 'ERROR DE CREACIÓN', message: error.message || 'No se pudo crear el nuevo rol estratégico.' });
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    // Verificar si hay usuarios con este rol
    const usersWithRole = users.filter(u => u.role === roleName);
    if (usersWithRole.length > 0) {
      showToast({
        type: 'error',
        title: 'Acceso Denegado',
        message: 'No tienes permisos para realizar esta acción administrativa.'
      });
      return;
    }

    const isConfirmed = await confirm(
      'ELIMINAR ROL',
      `¿Deseas retirar el cargo estratégico "${roleName}" del sistema?`,
      { 
        confirmText: 'ELIMINAR ROL',
        isDestructive: true 
      }
    );

    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      showToast({ type: 'success', title: 'ROL ELIMINADO', message: `El cargo "${roleName}" ha sido retirado del sistema.` });
      await loadCustomRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      showToast({ type: 'error', title: 'ERROR DE ELIMINACIÓN', message: 'No se pudo retirar el rol en este momento.' });
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password });
  };

  const isUserOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 3;
  };

  const formatLastSeen = (lastSeen?: string, createdAt?: string) => {
    const dateToUse = lastSeen || createdAt;
    if (!dateToUse) return 'Desconocido';
    
    const date = new Date(dateToUse);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);

    // Si es muy reciente, mantener "Ahora"
    if (diffInMinutes < 1) return 'Ahora';

    const timeStr = date.toLocaleTimeString('es-PE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    }).toLowerCase();

    // Hoy
    if (date.toDateString() === now.toDateString()) {
      return `hoy a las ${timeStr}`;
    }

    // Ayer
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `ayer a las ${timeStr}`;
    }

    // Más de 2 días: Formato largo
    const dateStr = date.toLocaleDateString('es-PE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    return `${dateStr} a las ${timeStr}`;
  };

  const roleLower = user?.role?.toLowerCase() || '';
  const isExecutive = roleLower.includes('director') || roleLower.includes('asesor');
  const isStaff = roleLower.includes('imagen') || roleLower.includes('secretaria') || roleLower.includes('relaciones') || roleLower.includes('eventos') || roleLower.includes('redes');

  const canManage = isExecutive;
  const canSee = !!user; // Todos los miembros autenticados pueden ver el equipo

  if (!canSee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <Shield className="w-16 h-16 mb-4 text-gray-300" />
        <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
        <p>Solo los directores, asesores y personal administrativo autorizado pueden ver el equipo.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-exec-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cargando miembros del equipo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen p-4 md:pt-4 md:px-6 text-exec-slate">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-exec-border gap-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Users className="w-6 h-6 text-exec-blue" />
            </div>
            <span>GESTIÓN DEL <span className="text-exec-blue">EQUIPO</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Administración estratégica de capital humano de alto nivel.</p>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddUser(true)}
              className="px-6 py-2.5 bg-exec-blue hover:bg-blue-500 text-white border border-exec-blue rounded-none font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] flex items-center gap-2.5 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Agregar Miembro
            </button>
            <button
              onClick={() => setShowManageRoles(true)}
              className="px-6 py-2.5 bg-white hover:bg-gray-100 text-black border border-exec-border rounded-none font-bold text-[11px] uppercase tracking-widest transition-all flex items-center gap-2.5 shadow-lg whitespace-nowrap"
            >
              <Shield className="w-4 h-4 text-exec-blue" />
              Gestionar Roles
            </button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-none shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#262626] bg-[#111]">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Agregar Nuevo Miembro</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue/50 transition-all placeholder:text-gray-700"
                  placeholder="Juan Pérez García"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue/50 transition-all placeholder:text-gray-700"
                  placeholder="correo@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cargo/Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-3 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue/50 transition-all appearance-none"
                >
                  <option value="" className="bg-[#151515]">Seleccionar cargo...</option>
                  {customRoles.map(role => (
                    <option key={role.id} value={role.name} className="bg-[#151515]">{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contraseña</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="flex-1 px-4 py-3 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue/50 transition-all placeholder:text-gray-700"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="px-4 py-3 bg-[#1A1A1A] border border-[#262626] text-gray-400 hover:text-white rounded-none transition-colors text-[10px] font-bold uppercase tracking-widest"
                  >
                    Generar
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 font-medium italic mt-1.5 tracking-wide">Guarda esta contraseña para proporcionarla al nuevo miembro.</p>
              </div>

              <div className="bg-exec-blue/5 border border-exec-blue/20 rounded-none p-4">
                <p className="text-[10px] text-exec-blue font-bold uppercase tracking-widest leading-relaxed">
                  Nota: El usuario recibirá un correo de confirmación antes de poder iniciar sesión por primera vez.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAddUser}
                  className="flex-1 px-6 py-3 bg-exec-blue hover:bg-blue-500 text-white rounded-none font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2.5"
                >
                  <Save className="w-4 h-4" />
                  Crear Miembro
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-6 py-3 bg-[#151515] border border-[#262626] text-gray-400 hover:text-white hover:border-gray-600 rounded-none font-bold text-[11px] uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Roles Modal */}
      {showManageRoles && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-none shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#262626] bg-[#111] flex-shrink-0">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Gestionar Roles Ejecutivos</h2>
              <button onClick={() => setShowManageRoles(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {/* Create New Role */}
              <div className="bg-[#111111] border border-[#262626] rounded-none p-6 shadow-sm">
                <h3 className="text-[11px] font-bold text-white mb-6 uppercase tracking-widest border-l-2 border-exec-blue pl-4">Crear Nuevo Rol</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nombre del Rol</label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue/50 transition-all placeholder:text-gray-700"
                      placeholder="Ej: Editor, Fotógrafo, Gestor de Redes"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descripción de Funciones</label>
                    <textarea
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      className="w-full px-4 py-3 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:ring-1 focus:ring-exec-blue focus:border-exec-blue/50 transition-all placeholder:text-gray-700 min-h-[80px] resize-none"
                      placeholder="Define brevemente las responsabilidades..."
                    />
                  </div>
                  <button
                    onClick={handleCreateRole}
                    className="w-full px-6 py-3 bg-exec-blue/10 hover:bg-exec-blue/20 text-exec-blue border border-exec-blue/30 hover:border-exec-blue/50 rounded-none font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] flex items-center justify-center gap-2.5"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Rol
                  </button>
                </div>
              </div>

              {/* Existing Roles */}
              <div className="space-y-6">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-l-2 border-gray-700 pl-4">Roles Existentes ({customRoles.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customRoles.map(role => {
                    const usersWithRole = users.filter(u => u.role === role.name).length;
                    return (
                      <div key={role.id} className="flex flex-col p-5 bg-[#111111] border border-[#262626] rounded-none hover:border-exec-blue/30 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                            <Shield className="w-4 h-4 text-exec-blue" />
                          </div>
                          <button
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                            title="Eliminar rol"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-bold text-white text-sm uppercase tracking-wide mb-1">{role.name}</p>
                        {role.description && (
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2">{role.description}</p>
                        )}
                        <div className="mt-auto pt-4 border-t border-[#262626] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-exec-blue shadow-[0_0_5px_rgba(0,136,255,1)]"></div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{usersWithRole} MIEMBRO(S)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex gap-6 mb-6 border-b border-[#262626] px-2">
        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 text-xs uppercase font-black tracking-widest transition-all relative ${
            activeTab === 'team'
              ? 'text-exec-blue'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <span>Miembros del Equipo ({users.length})</span>
          {activeTab === 'team' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-exec-blue shadow-[0_0_8px_#0088FF]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('registrants')}
          className={`pb-3 text-xs uppercase font-black tracking-widest transition-all relative ${
            activeTab === 'registrants'
              ? 'text-exec-blue'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <span>Registrados en el Observatorio ({registrants.length})</span>
          {activeTab === 'registrants' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-exec-blue shadow-[0_0_8px_#0088FF]"></div>
          )}
        </button>
      </div>

      {activeTab === 'team' ? (
        <>
          {/* =========================================================================
              VISTA DE ESCRITORIO (hidden md:block) - EQUIPO
             ========================================================================= */}
          <div className="hidden md:block bg-[#0D0D0D] border border-[#262626] rounded-none shadow-2xl overflow-hidden mb-12">
            <div className="px-8 py-6 border-b border-[#262626] bg-[#111] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                  <Users className="w-5 h-5 text-exec-blue" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Miembros del Equipo ({users.length})</h2>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#111111] border-b border-[#262626]">
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Miembro
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Contacto
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Cargo Ejecutivo
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Alta Sistema
                    </th>
                    <th className="px-8 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-[#151515] transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#262626] flex items-center justify-center overflow-hidden group-hover:border-exec-blue/30 transition-all">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-exec-blue uppercase">
                                  {u.fullName.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black transition-colors ${isUserOnline(u.last_seen) ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_5px_#ef4444]'}`}></div>
                          </div>
                          <div>
                            <span className="font-bold text-white text-[13px]">{u.fullName}</span>
                            <span className="text-[9px] uppercase font-bold text-gray-600 tracking-wider block mt-0.5">ID: {u.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-white font-medium">{u.email}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                            {isUserOnline(u.last_seen) ? (
                              <span className="text-green-500">Conectado ahora</span>
                            ) : (
                              <span>Última vez {formatLastSeen(u.last_seen, u.created_at)}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-exec-blue/5 border border-exec-blue/20 text-exec-blue text-[9px] font-black rounded-none uppercase tracking-widest">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-xs text-gray-400 font-medium">
                        {new Date(u.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right">
                        {canManage && (
                          <>
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-2 text-gray-600 hover:text-exec-blue transition-colors mr-2"
                              title="Editar miembro"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.fullName)}
                                className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                                title="Eliminar miembro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* =========================================================================
              VISTA MÓVIL (block md:hidden) - EQUIPO
             ========================================================================= */}
          <div className="block md:hidden space-y-4 mb-8">
            <div className="flex items-center justify-between mb-4 bg-[#111] p-4 border border-[#262626] rounded-none">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-exec-blue" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Miembros ({users.length})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {users.map(u => (
                <div key={u.id} className="bg-[#0D0D0D] border border-[#262626] rounded-none p-4 space-y-4 shadow-sm active:bg-[#111] transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#262626] flex items-center justify-center overflow-hidden">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-exec-blue uppercase">{u.fullName.charAt(0)}</span>
                          )}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0D0D0D] ${isUserOnline(u.last_seen) ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-[13px] truncate">{u.fullName}</h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-exec-blue/5 border border-exec-blue/20 text-exec-blue text-[8px] font-black rounded-none uppercase tracking-wider">
                            {u.role}
                          </span>
                          <span className="text-[8px] font-black uppercase text-gray-600">
                            {isUserOnline(u.last_seen) ? <span className="text-green-500">Online</span> : `Última vez ${formatLastSeen(u.last_seen, u.created_at)}`}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-500 font-medium truncate italic mt-0.5">{u.email}</p>
                      </div>
                    </div>
                    
                    {canManage && (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setEditingUser(u)} 
                          className="p-2 bg-[#1A1A1A] border border-[#262626] text-gray-400 rounded-none active:text-exec-blue"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== user?.id && (
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.fullName)} 
                            className="p-2 bg-[#1A1A1A] border border-[#262626] text-gray-400 rounded-none active:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingUser?.id === u.id && (
                    <div className="space-y-3 pt-3 border-t border-[#262626] animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1.5">
                        <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">Cambiar Cargo</label>
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-exec-blue/30 rounded-none text-[10px] font-black text-white outline-none uppercase tracking-wider"
                        >
                          {customRoles.map(role => (
                            <option key={role.id} value={role.name}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateUserRole(u.id, editingUser.role)}
                          className="flex-1 py-2.5 bg-exec-blue text-white text-[9px] font-black uppercase rounded-none shadow-lg shadow-exec-blue/10 active:bg-blue-500"
                        >
                          Guardar Cambios
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-4 py-2.5 bg-[#1A1A1A] border border-[#262626] text-gray-500 text-[9px] font-black uppercase rounded-none"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-[9px] font-black uppercase tracking-tighter text-gray-600 border-t border-[#262626]/30">
                    <span>Desde: {new Date(u.created_at).toLocaleDateString()}</span>
                    <span>ID: {u.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* =========================================================================
              VISTA DE ESCRITORIO (hidden md:block) - REGISTRADOS
             ========================================================================= */}
          <div className="hidden md:block bg-[#0D0D0D] border border-[#262626] rounded-none shadow-2xl overflow-hidden mb-12">
            <div className="px-8 py-6 border-b border-[#262626] bg-[#111] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                  <Users className="w-5 h-5 text-exec-blue" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Registrados en el Observatorio ({registrants.length})</h2>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#111111] border-b border-[#262626]">
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Registrado
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Contacto
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Institución / Entidad
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Categoría
                    </th>
                    <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Evento / Actividad
                    </th>
                    {canManage && (
                      <th className="px-8 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {registrants.map(r => (
                    <tr key={r.id} className="hover:bg-[#151515] transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#262626] flex items-center justify-center overflow-hidden">
                            <span className="text-[10px] font-bold text-exec-blue uppercase">{r.fullName.charAt(0)}</span>
                          </div>
                          <span className="font-bold text-white text-[13px]">{r.fullName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-white font-medium">{r.email || 'Sin correo'}</span>
                          {r.phone && <span className="text-[10px] text-gray-500 font-medium">{r.phone}</span>}
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-xs text-gray-300 font-medium">
                        {r.institution}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-gray-300 text-[9px] font-black rounded-none uppercase tracking-wider">
                          {r.category === 'organizador' ? 'Organizador' :
                           r.category === 'co_organizador' ? 'Co-organizador' :
                           r.category === 'ponente' ? 'Ponente' :
                           r.category === 'comentarista' ? 'Comentarista' :
                           r.category === 'artista_invitado' ? 'Artista Invitado' :
                           'Participante General'}
                        </span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-white font-bold">{r.eventTitle}</span>
                          <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                            {new Date(r.registered_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      {canManage && (
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteRegistrant(r.id)}
                            className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {registrants.length === 0 && (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="text-center py-12 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        No hay registrados en el observatorio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* =========================================================================
              VISTA MÓVIL (block md:hidden) - REGISTRADOS
             ========================================================================= */}
          <div className="block md:hidden space-y-4 mb-8">
            <div className="flex items-center justify-between mb-4 bg-[#111] p-4 border border-[#262626] rounded-none">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-exec-blue" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Registrados ({registrants.length})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {registrants.map(r => (
                <div key={r.id} className="bg-[#0D0D0D] border border-[#262626] rounded-none p-4 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#262626] flex items-center justify-center">
                        <span className="text-xs font-bold text-exec-blue uppercase">{r.fullName.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-[13px] truncate">{r.fullName}</h3>
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-400 text-[8px] font-black rounded-none uppercase tracking-wider">
                          {r.category === 'organizador' ? 'Organizador' :
                           r.category === 'co_organizador' ? 'Co-organizador' :
                           r.category === 'ponente' ? 'Ponente' :
                           r.category === 'comentarista' ? 'Comentarista' :
                           r.category === 'artista_invitado' ? 'Artista Invitado' :
                           'Participante'}
                        </span>
                        <p className="text-[9px] text-gray-500 font-medium truncate italic mt-0.5">{r.email}</p>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteRegistrant(r.id)}
                        className="p-2 bg-[#1A1A1A] border border-[#262626] text-gray-400 active:text-red-400 rounded-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[#262626]/30 flex flex-col gap-1 text-[9px] text-gray-400 font-medium">
                    <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[8px]">Entidad:</span> {r.institution}</div>
                    <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[8px]">Actividad:</span> {r.eventTitle}</div>
                    <div><span className="font-bold text-gray-500 uppercase tracking-widest text-[8px]">Registro:</span> {new Date(r.registered_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {registrants.length === 0 && (
                <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  No hay registrados en el observatorio.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
