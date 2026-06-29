import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { useToast } from '../ui/ToastContext';
import { useConfirm } from '../ui/ConfirmModal';
import { 
  Users, CheckCircle2, XCircle, Clock, Mail, Briefcase, 
  Search, Filter, ShieldCheck, UserX, UserCheck, ChevronRight
} from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Pendiente' | 'Aprobado' | 'Rechazado'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const usersData: User[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email || '',
        fullName: user.full_name || user.fullName || 'Sin nombre',
        role: user.role || 'Miembro',
        status: user.status || 'Pendiente',
        approved: user.approved || false,
        avatarUrl: user.avatar_url || user.avatarUrl,
        createdAt: new Date(user.updated_at || Date.now()),
      }));

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast({
        type: 'error',
        title: 'ERROR DE CARGA',
        message: 'No se pudieron recuperar las solicitudes de registro.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, userName: string, newStatus: 'Aprobado' | 'Rechazado') => {
    const actionLabel = newStatus === 'Aprobado' ? 'APROBAR' : 'RECHAZAR';
    
    const isConfirmed = await confirm(
      `${actionLabel} ACCESO`,
      `¿Estás seguro de ${newStatus.toLowerCase()} el acceso estratégico de ${userName}?`,
      { 
        confirmText: actionLabel,
        isDestructive: newStatus === 'Rechazado'
      }
    );

    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: newStatus, 
          approved: newStatus === 'Aprobado' 
        })
        .eq('id', userId);

      if (error) throw error;

      showToast({
        type: newStatus === 'Aprobado' ? 'success' : 'info',
        title: `SOLICITUD ${newStatus.toUpperCase()}`,
        message: `El perfil de ${userName} ha sido actualizado correctamente.`
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast({
        type: 'error',
        title: 'ERROR ESTRATÉGICO',
        message: 'No se pudo procesar el cambio de estado.'
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.status === filter;
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'Pendiente').length,
    approved: users.filter(u => u.status === 'Aprobado').length,
    rejected: users.filter(u => u.status === 'Rechazado').length,
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-2 border-exec-blue border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500">Sincronizando Inteligencia de Usuarios...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen p-4 md:pt-4 md:px-6 text-exec-slate">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-exec-border gap-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Users className="w-6 h-6 text-exec-blue" />
            </div>
            <span>AUDITORÍA DE <span className="text-exec-blue">REGISTROS</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Control de acceso y validación de credenciales institucionales.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="BUSCAR POR NOMBRE O EMAIL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0D0D0D] border border-exec-border rounded-none text-[11px] font-bold text-white focus:ring-1 focus:ring-exec-blue outline-none uppercase placeholder:text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Registros', value: stats.total, icon: Users, color: 'text-white', border: 'border-exec-border' },
          { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-yellow-500', border: 'border-yellow-500/20' },
          { label: 'Aprobados', value: stats.approved, icon: ShieldCheck, color: 'text-exec-blue', border: 'border-exec-blue/20' },
          { label: 'Rechazados', value: stats.rejected, icon: UserX, color: 'text-red-500', border: 'border-red-500/20' }
        ].map((stat, i) => (
          <div key={i} className={`bg-[#0D0D0D] border ${stat.border} p-5 flex flex-col gap-2 relative overflow-hidden group`}>
            <div className="flex justify-between items-start z-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color} opacity-40`} />
            </div>
            <span className={`text-2xl font-black ${stat.color} z-10`}>{stat.value}</span>
            <div className={`absolute bottom-0 right-0 w-24 h-24 translate-x-8 translate-y-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 ${stat.color}`}>
              <stat.icon className="w-full h-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'TODOS' },
          { id: 'Pendiente', label: 'PENDIENTES' },
          { id: 'Aprobado', label: 'APROBADOS' },
          { id: 'Rechazado', label: 'RECHAZADOS' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
              filter === f.id 
                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                : 'bg-transparent text-gray-500 border-exec-border hover:text-white hover:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table / List */}
      <div className="bg-[#0D0D0D] border border-exec-border rounded-none shadow-2xl overflow-hidden mb-12">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#111] border-b border-exec-border">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">IDENTIFICACIÓN</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">CARGO PROPUESTO</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">ESTADO ACTUAL</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">FECHA REGISTRO</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-exec-border">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1A1A1A] border border-exec-border rounded-none flex items-center justify-center overflow-hidden shrink-0 group-hover:border-exec-blue/40 transition-all">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-black text-exec-blue">{user.fullName.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white hover:text-exec-blue transition-colors cursor-default truncate">{user.fullName}</div>
                        <div className="text-[10px] text-gray-600 font-bold tracking-tight truncate flex items-center gap-1.5 uppercase">
                          <Mail className="w-3 h-3 text-exec-blue/60" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-exec-blue/40" />
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${
                      user.status === 'Aprobado' ? 'bg-exec-blue/10 border-exec-blue/30 text-exec-blue' :
                      user.status === 'Pendiente' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                      'bg-red-500/10 border-red-500/30 text-red-500'
                    }`}>
                      {user.status === 'Pendiente' && <Clock className="w-3 h-3 animate-pulse" />}
                      {user.status === 'Aprobado' && <ShieldCheck className="w-3 h-3" />}
                      {user.status === 'Rechazado' && <UserX className="w-3 h-3" />}
                      <span>{user.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                      {user.createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.status === 'Pendiente' ? (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(user.id, user.fullName, 'Aprobado')}
                            className="p-2 bg-exec-blue/10 text-exec-blue border border-exec-blue/20 hover:bg-exec-blue hover:text-white transition-all"
                            title="Aprobar Acceso"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(user.id, user.fullName, 'Rechazado')}
                            className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                            title="Rechazar Acceso"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(user.id, user.fullName, user.status === 'Aprobado' ? 'Pendiente' : 'Aprobado')}
                          className="px-4 py-1.5 border border-exec-border text-gray-500 text-[9px] font-black uppercase tracking-widest hover:text-white hover:border-gray-500 transition-all"
                        >
                          {user.status === 'Aprobado' ? 'Desactivar' : 'Reactivar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Users className="w-12 h-12" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No se han detectado perfiles que coincidan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

