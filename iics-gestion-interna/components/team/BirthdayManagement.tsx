import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Cake, Calendar, User as UserIcon, Info, Plus, Save, X, 
  ChevronRight, Gift, PartyPopper, MessageSquare,
  Clock, MapPin, Users as UsersIcon, ChevronLeft,
  Sparkles, Star, Heart, Zap
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays, getYear, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateBirthdayEmailTemplate } from '../../lib/emailTemplates';

interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string;
  bio: string;
  birth_date: string;
}

interface BirthdayCollaboration {
  id: string;
  plan_id: string;
  profile_id: string;
  contribution: string;
  status: string;
  profile?: Profile;
}

interface BirthdayPlan {
  id: string;
  profile_id: string;
  year: number;
  plan_type: string;
  details: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  greeting_sent: boolean;
  greeting_sent_at?: string;
  collaborations?: BirthdayCollaboration[];
}

const parseBirthDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

export const BirthdayManagement: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<BirthdayPlan[]>([]);
  const [collaborations, setCollaborations] = useState<BirthdayCollaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [viewingYear, setViewingYear] = useState(getYear(new Date()));
  
  const [newPlan, setNewPlan] = useState({
    plan_type: 'Compartir',
    details: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '17:00',
    year: getYear(new Date()),
    collaborators: [] as { profile_id: string, contribution: string }[]
  });

  const [sendingGreeting, setSendingGreeting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch profiles with full resolution
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, "fullName", email, role, "avatarUrl", bio, birth_date')
        .order('"fullName"');

      if (profilesError) throw profilesError;

      // Helper to resolve avatar URLs
      const getAvatarUrl = (path: string | null) => {
        if (!path) return `https://ui-avatars.com/api/?background=0D0D0D&color=3b82f6&size=128&bold=true`;
        if (path.startsWith('http')) return path;
        const bucket = 'avatars';
        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
      };

      const resolvedProfiles = (profilesData || []).map(p => ({
        ...p,
        avatarUrl: getAvatarUrl(p.avatarUrl)
      }));

      // Fetch plans and collaborations
      const currentYear = getYear(new Date());
      const { data: plansData, error: plansError } = await supabase
        .from('birthday_plans')
        .select(`
            *,
            collaborations:birthday_collaborations(
                *,
                profile:profiles(id, "fullName", "avatarUrl")
            )
        `)
        .gte('year', currentYear);

      if (plansError) throw plansError;

      setProfiles(resolvedProfiles);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading birthday data:', error);
      setToast({ type: 'error', msg: 'Error al cargar datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPlan = (p: Profile, isEditRequested: boolean) => {
    const viewOnly = !isEditRequested;
    const hasPlan = plans.some(pl => pl.profile_id === p.id && pl.year === viewingYear);
    
    // Protocolo de Sigilo: Solo bloquear si REALMENTE hay un plan que ocultar
    if (user?.id === p.id && hasPlan) {
        setToast({ type: 'error', msg: 'No puedes ver tu propio plan de Cumpleaños (¡Es una sorpresa!)' });
        return;
    }

    const existingPlan = plans.find(pl => pl.profile_id === p.id && pl.year === viewingYear);
    setNewPlan({
        plan_type: existingPlan?.plan_type || 'Compartir',
        details: existingPlan?.details || '',
        scheduled_date: existingPlan?.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: existingPlan?.scheduled_time || '17:00',
        year: viewingYear,
        collaborators: existingPlan?.collaborations?.map(c => ({
            profile_id: c.profile_id,
            contribution: c.contribution,
            status: c.status
        })) || []
    });
    
    setSelectedProfile(p);
    setIsViewMode(viewOnly); // Strictly respect the requested mode
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async () => {
    if (!selectedProfile) return;
    
    try {
      const { data: planData, error } = await supabase
        .from('birthday_plans')
        .upsert({
          profile_id: selectedProfile.id,
          year: newPlan.year,
          plan_type: newPlan.plan_type,
          details: newPlan.details,
          scheduled_date: newPlan.scheduled_date,
          scheduled_time: newPlan.scheduled_time,
          status: 'Planificado'
        }, { onConflict: 'profile_id, year' })
        .select()
        .single();

      if (error) throw error;
      const planId = planData.id;

      // Sync Collaborations
      // 1. Clear old
      await supabase.from('birthday_collaborations').delete().eq('plan_id', planId);

      // 2. Insert new
      if (newPlan.collaborators.length > 0) {
        const collabToInsert = newPlan.collaborators.map(c => ({
          plan_id: planId,
          profile_id: c.profile_id,
          contribution: c.contribution,
          status: 'Pendiente'
        }));
        const { error: collabError } = await supabase.from('birthday_collaborations').insert(collabToInsert);
        if (collabError) throw collabError;
      }

      // Integration with Calendar: Create a meeting/event
      const { error: eventError } = await supabase
        .from('events')
        .insert({
          title: `Celebración: Cumpleaños de ${selectedProfile.fullName}`,
          description: newPlan.details || `Reunión para celebrar el Cumpleaños de ${selectedProfile.fullName}.`,
          date: newPlan.scheduled_date,
          time: newPlan.scheduled_time,
          type: 'meeting',
          created_by: user?.id,
          // Add extra fields if your events table supports them
        });

      if (eventError) console.warn('Error creating calendar event:', eventError);

      setToast({ type: 'success', msg: 'Celebración planificada y agendada' });
      setShowPlanModal(false);
      loadData();

      // Notify other team members (exclude the birthday person)
      try {
        const otherProfiles = profiles.filter(p => p.id !== selectedProfile.id);
        const notificationPromises = otherProfiles.map(p => 
          supabase.from('notifications').insert({
            user_id: p.id,
            type: 'birthday_planned',
            title: '¡Nueva planificación de Cumpleaños!',
            message: `Se ha coordinado un(a) ${newPlan.plan_type} para el Cumpleaños de ${selectedProfile.fullName} el ${format(parseISO(newPlan.scheduled_date), "dd 'de' MMMM", { locale: es })}.`,
            data: { 
              profile_id: selectedProfile.id, 
              plan_type: newPlan.plan_type,
              link: '/birthdays' 
            }
          })
        );
        await Promise.all(notificationPromises);
      } catch (notifyError) {
        console.warn('Error sending team notifications:', notifyError);
      }
      
    } catch (error: any) {
      setToast({ type: 'error', msg: error.message || 'Error al guardar el plan' });
    }
  };

  const handleSendGreeting = async (profile: Profile) => {
    if (!profile.email) {
      setToast({ type: 'error', msg: 'El usuario no tiene correo registrado' });
      return;
    }

    setSendingGreeting(profile.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. envíar el correo real usando la Edge Function
      const birthdayHtml = generateBirthdayEmailTemplate(profile.fullName);
      
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: profile.email,
          subject: `¡FELIZ Cumpleaños, ${profile.fullName.toUpperCase()}! // ACS 🎂`,
          html: birthdayHtml,
          type: 'birthday',
          recipient_name: profile.fullName
        }
      });

      if (edgeError) throw edgeError;

      // 2. Actualizar registro en birthday_plans
      const currentYear = getYear(new Date());
      const { error: upsertError } = await supabase
        .from('birthday_plans')
        .upsert({
          profile_id: profile.id,
          year: currentYear,
          greeting_sent: true,
          greeting_sent_at: new Date().toISOString(),
          status: 'Planificado'
        }, { onConflict: 'profile_id, year' });

      if (upsertError) throw upsertError;

      setToast({ type: 'success', msg: `Saludo envíado a ${profile.fullName}` });
      loadData();
    } catch (error: any) {
      console.error('Error sending greeting:', error);
      setToast({ type: 'error', msg: error.message || 'Error al envíar el saludo' });
    } finally {
      setSendingGreeting(null);
    }
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    return profiles
      .filter(p => p.birth_date)
      .map(p => {
        const bd = parseBirthDate(p.birth_date);
        const thisYearBd = new Date(getYear(today), bd.getMonth(), bd.getDate());
        
        // If birthday already passed this year, look for next year
        const targetDate = isBefore(thisYearBd, today) && !isSameDay(thisYearBd, today)
          ? new Date(getYear(today) + 1, bd.getMonth(), bd.getDate())
          : thisYearBd;

        return { ...p, targetDate };
      })
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  };

  const upcoming = getUpcomingBirthdays();
  const currentMonthUsers = profiles.filter(p => p.birth_date && isSameMonth(parseBirthDate(p.birth_date), new Date()));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-exec-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-1000 bg-[#050505] min-h-screen">
      {/* Header — Executive Drive */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-exec-border pb-4 px-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <Cake className="w-6 h-6 text-exec-blue" />
            </div>
            <span>Gestión de <span className="text-exec-blue">Cumpleaños</span></span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Coordina las Celebraciónes del equipo y envía Felicitaciónes.</p>
        </div>

        <div className="flex items-center gap-6 bg-[#0A0A0A] border border-exec-border p-3">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Este Mes</p>
            <p className="text-xl font-black text-white leading-none">{currentMonthUsers.length}</p>
          </div>
          <div className="border-l border-exec-border pl-6">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Próxima Fecha</p>
            <p className="text-[10px] font-mono text-white whitespace-nowrap">
              {upcoming[0]?.targetDate ? format(upcoming[0].targetDate, "dd.MM.yyyy", { locale: es }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed top-8 right-8 z-[200] px-6 py-4 rounded-sm border shadow-2xl animate-in slide-in-from-right-8 duration-300 flex items-center gap-4 ${
          toast.type === 'success' ? 'bg-[#0D0D0D] border-green-500/20 text-green-400' : 'bg-[#0D0D0D] border-red-500/20 text-red-400'
        }`}>
          <Sparkles className="w-5 h-5 transition-all animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      {/* Hero Section Táctico */}
      {upcoming.length > 0 && (
        <div className="container mx-auto px-4">
          <div 
            onClick={() => handleOpenPlan(upcoming[0], false)}
            className="relative group overflow-hidden bg-black border border-[#1a1a1a] shadow-2xl cursor-pointer hover:border-exec-blue/40 transition-all duration-500"
          >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_-20%,rgba(0,136,255,0.08),transparent)] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-exec-blue/5 blur-[100px] -z-10 group-hover:bg-exec-blue/10 transition-all duration-1000"></div>
            
            <div className="flex flex-col lg:flex-row items-stretch min-h-[220px]">
              {/* Profile Side */}
              <div className="w-full lg:w-1/5 p-2 flex items-center justify-center relative border-b lg:border-b-0 lg:border-r border-[#1a1a1a]">
                  <div className="relative">
                      {/* Neural Ring Effect */}
                      <div className="absolute inset-0 -m-3 border border-exec-blue/20 rounded-none animate-[spin_20s_linear_infinite]"></div>
                      <div className="absolute inset-0 -m-6 border border-dotted border-exec-blue/20 rounded-none animate-[spin_40s_linear_infinite_reverse]"></div>
                      
                      <div className="relative z-10">
                          <div className="absolute -inset-0.5 bg-exec-blue blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                          <img 
                              src={upcoming[0].avatarUrl || 'https://via.placeholder.com/150'} 
                              className="relative w-48 h-48 md:w-56 md:h-56 object-cover border border-[#1a1a1a] shadow-lg transition-all duration-700"
                              alt={upcoming[0].fullName}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-exec-blue p-2 shadow-[0_0_15px_rgba(0,136,255,0.4)]">
                              <Cake className="w-4 h-4 text-white" />
                          </div>
                      </div>
                  </div>
              </div>

              {/* Data Side */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-center space-y-4">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                         <div className="w-1.5 h-1.5 bg-exec-blue rounded-full animate-pulse"></div>
                         <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Próxima Celebración</p>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">
                          {upcoming[0].fullName}
                      </h3>
                      <p className="inline-block px-4 py-1.5 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue text-[10px] font-bold uppercase tracking-widest">
                          {upcoming[0].role}
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                      <div className="space-y-4">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                             <Calendar size={12} className="text-exec-blue" /> Fecha
                          </p>
                          <p className="text-white text-xl font-bold uppercase tracking-tight">
                              {format(upcoming[0].targetDate, "EEEE d 'de' MMMM", { locale: es })}
                          </p>
                      </div>
                      <div className="space-y-4">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                             <Info size={12} className="text-exec-blue" /> Biografía
                          </p>
                          <p className="text-gray-400 text-xs leading-relaxed italic font-medium max-w-sm">
                              "{upcoming[0].bio || 'Sin Biografía disponible en el registro central.'}"
                          </p>
                      </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              const hasPlan = plans.some(pl => pl.profile_id === upcoming[0].id && pl.year === viewingYear);
                              handleOpenPlan(upcoming[0], !hasPlan);
                          }}
                          className="px-4 py-2 bg-exec-blue hover:bg-blue-500 text-white transition-all text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-exec-blue/20"
                      >
                           {plans.some(pl => pl.profile_id === upcoming[0].id && pl.year === viewingYear) ? (
                               <><Sparkles className="w-4 h-4" /> Ver Detalles</>
                           ) : (
                               <><Plus className="w-4 h-4" /> Planificar Celebración</>
                           )}
                      </button>
                       <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              handleSendGreeting(upcoming[0]);
                          }}
                          disabled={sendingGreeting === upcoming[0].id}
                          className={`px-4 py-2 transition-all text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-exec-border ${
                            sendingGreeting === upcoming[0].id 
                            ? 'bg-exec-blue/20 text-exec-blue opacity-50' 
                            : 'bg-white hover:bg-gray-100 text-black'
                          }`}
                      >
                          {sendingGreeting === upcoming[0].id ? (
                            <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Gift className="w-2.5 h-2.5 text-blue-500" />
                          )}
                          Enviar Felicitación
                      </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Directorio de Miembros Táctico */}
      <div className="container mx-auto px-4 pb-24 space-y-12">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-[#1a1a1a] pb-8 gap-4">
            <div className="flex items-center gap-6">
                <div className="w-2 h-10 bg-exec-blue"></div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Registro de Aniversarios</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{profiles.length} miembros registrados</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <select 
                        value={viewingYear}
                        onChange={(e) => setViewingYear(parseInt(e.target.value))}
                        className="appearance-none bg-[#0a0a0a] border border-[#1a1a1a] text-[10px] font-black text-white uppercase tracking-[0.2em] px-8 py-4 outline-none focus:border-exec-blue transition-all cursor-pointer min-w-[200px]"
                    >
                        {[...Array(2031 - getYear(new Date()))].map((_, i) => {
                            const year = getYear(new Date()) + i;
                            return <option key={year} value={year}>{year}</option>;
                        })}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                        <ChevronRight className="w-3 h-3 rotate-90" />
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {profiles.map(p => {
                const plan = plans.find(pl => pl.profile_id === p.id && pl.year === viewingYear);
                const bdDate = p.birth_date ? format(parseBirthDate(p.birth_date), "dd 'de' MMMM", { locale: es }) : 'N/D';
                
                return (
                    <div 
                        key={p.id} 
                        onClick={() => handleOpenPlan(p, false)}
                        className="relative group bg-[#0a0a0a] border border-[#1a1a1a] p-8 hover:border-exec-blue/40 transition-all duration-500 overflow-hidden cursor-pointer"
                    >
                        {/* Interactive Background */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-exec-blue/0 group-hover:bg-exec-blue/5 blur-3xl transition-all duration-700"></div>
                        <div className="absolute top-0 left-0 w-1 h-0 bg-exec-blue group-hover:h-full transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                        
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-5">
                                <div className="relative group/avatar">
                                    <div className="absolute inset-0 bg-exec-blue/20 blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                                    <img 
                                        src={p.avatarUrl || 'https://via.placeholder.com/150'} 
                                        className="relative w-16 h-16 object-cover border border-[#1a1a1a] transition-all duration-500 group-hover/avatar:border-blue-500"
                                        alt={p.fullName}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-exec-blue transition-colors leading-tight">
                                        {p.fullName}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{p.role}</p>
                                        {plan && plan.collaborations && plan.collaborations.length > 0 && (
                                            <div className="flex -space-x-1.5 ml-2">
                                                {plan.collaborations.slice(0, 3).map(c => (
                                                    <img 
                                                        key={c.id} 
                                                        src={c.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.profile?.fullName || '')}`}
                                                        className="w-4 h-4 rounded-full border border-black shadow-sm"
                                                        title={c.profile?.fullName}
                                                    />
                                                ))}
                                                {plan.collaborations.length > 3 && (
                                                    <div className="w-4 h-4 rounded-full bg-[#111] border border-black flex items-center justify-center text-[6px] text-gray-400">
                                                        +{plan.collaborations.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={`p-2 border ${plan ? 'border-green-500/30 bg-green-500/5 text-green-500 animate-pulse' : 'border-gray-500/10 bg-white/5 text-gray-700'}`}>
                                <Clock size={12} />
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            {/* Protocolo de Sigilo: Enmascarar si es el cumpleañero */}
                            {user?.id === p.id && plan ? (
                               <div className="p-4 bg-exec-blue/5 border border-exec-blue/20 text-center space-y-2">
                                  <Sparkles className="w-5 h-5 text-exec-blue mx-auto animate-pulse" />
                                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sorpresa en preparación</p>
                                  <p className="text-[8px] text-gray-500 uppercase font-mono">Acceso restringido para el homenajeado</p>
                               </div>
                            ) : (
                               <>
                                <div className="flex items-center justify-between p-3 bg-black/40 border-l-2 border-[#1a1a1a] group-hover:border-exec-blue/40 transition-all">
                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Fecha de Nacimiento</span>
                                    <span className="text-[10px] font-bold text-white uppercase">{bdDate}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-black/40 border-l-2 border-[#1a1a1a] group-hover:border-exec-blue/40 transition-all">
                                     <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Estado del Saludo</span>
                                     <span className={`text-[9px] font-black uppercase tracking-widest ${
                                         plan?.greeting_sent ? 'text-green-500' : 'text-gray-600'
                                     }`}>
                                         {plan?.greeting_sent ? 'Enviado' : 'No Enviado'}
                                     </span>
                                 </div>
                                 {plan?.collaborations && plan.collaborations.length > 0 && (
                                     <div className="p-3 bg-exec-blue/5 border-l-2 border-exec-blue/30 space-y-2">
                                         <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Equipo Logístico</span>
                                            <div className="flex -space-x-1.5">
                                                {plan.collaborations.map((c: any, i: number) => (
                                                    <img key={i} src={c.profile?.avatar_url} className="w-4 h-4 rounded-full ring-1 ring-black border border-exec-blue/20" title={c.profile?.fullName} />
                                                ))}
                                            </div>
                                         </div>
                                         <div className="space-y-1">
                                            {plan.collaborations.slice(0, 3).map((c: any, i: number) => (
                                                <p key={i} className="text-[9px] text-gray-400 uppercase font-mono truncate leading-none">
                                                    <span className="text-blue-400/70 font-black">{c.profile?.fullName?.split(' ')[0]}:</span> {c.contribution || '???'}
                                                </p>
                                            ))}
                                            {plan.collaborations.length > 3 && (
                                                <p className="text-[9px] text-gray-700 font-mono italic">+ {plan.collaborations.length - 3} aportes adicionales</p>
                                            )}
                                         </div>
                                     </div>
                                 )}
                               </>
                            )}
                        </div>

                        <div className="flex gap-2">
                           <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPlan(p, !plan); // If no plan, request edit (true for requestedEdit)
                              }}
                              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white border border-exec-border hover:border-exec-blue transition-all text-[8px] font-bold uppercase tracking-widest"
                          >
                              {plan ? 'Ver Plan' : 'Planificar'}
                          </button>
                          <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendGreeting(p);
                              }}
                              disabled={sendingGreeting === p.id}
                              className={`flex-1 px-4 py-3 border border-[#1a1a1a] transition-all text-[8px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${
                                sendingGreeting === p.id 
                                ? 'bg-exec-blue/20 text-exec-blue opacity-50' 
                                : 'bg-exec-blue/10 hover:bg-exec-blue/20 text-exec-blue font-black'
                              }`}
                          >
                              {sendingGreeting === p.id ? (
                                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Gift size={10} />
                              )}
                              FELICITAR
                          </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Modal de Planificación Táctico */}
      {showPlanModal && selectedProfile && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#050505] border border-[#1a1a1a] max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_100px_rgba(0,136,255,0.1)] animate-in zoom-in-95 duration-300 relative">
                {/* Decorative Tech Lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-exec-blue to-transparent opacity-50"></div>
                
                <div className="p-6 border-b border-[#111] bg-black flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                           <div className="w-1 h-3 bg-exec-blue"></div>
                           <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">
                                {isViewMode ? 'Detalles de la Celebración' : 'Planificación Estratégica'}
                           </h3>
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                            Celebración: {selectedProfile.fullName}
                        </h2>
                    </div>
                    <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-white/5 border border-transparent hover:border-[#1a1a1a] transition-all text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {isViewMode && !plans.find(pl => pl.profile_id === selectedProfile.id && pl.year === viewingYear) ? (
                        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#1a1a1a] bg-black/40 space-y-4">
                            <div className="w-16 h-16 bg-exec-blue/5 flex items-center justify-center border border-exec-blue/10">
                                <Clock className="w-8 h-8 text-exec-blue/20" />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Sin Planificación Activa</p>
                                <p className="text-[9px] text-gray-600 font-mono">No se ha registrado una hoja de ruta para el cumpleaños de este miembro en {viewingYear}.</p>
                            </div>
                            <button 
                                onClick={() => setIsViewMode(false)}
                                className="px-6 py-2 bg-exec-blue/10 hover:bg-exec-blue/20 text-exec-blue border border-exec-blue/20 text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                + CREAR PLANIZACIÓN AHORA
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Tipo de Celebración</label>
                                    <select 
                                        value={newPlan.plan_type}
                                        disabled={isViewMode}
                                        onChange={e => setNewPlan({...newPlan, plan_type: e.target.value})}
                                        className="w-full p-3 bg-black border border-[#1a1a1a] text-[10px] text-white focus:border-blue-600 outline-none transition-all uppercase font-bold tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="Compartir">Compartir</option>
                                        <option value="Almuerzo">Almuerzo Ejecutivo</option>
                                        <option value="Regalo">Entrega de Regalo</option>
                                        <option value="Sorpresa">Operación Sorpresa</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">AÑO_FISCAL</label>
                                    <select 
                                        value={newPlan.year}
                                        disabled={isViewMode}
                                        onChange={e => setNewPlan({...newPlan, year: parseInt(e.target.value)})}
                                        className="w-full p-3 bg-black border border-[#1a1a1a] text-[10px] text-white focus:border-blue-600 outline-none transition-all uppercase font-bold tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {[...Array(2031 - getYear(new Date()))].map((_, i) => {
                                            const year = getYear(new Date()) + i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Fecha de Celebración</label>
                            <input 
                                type="date"
                                disabled={isViewMode}
                                value={newPlan.scheduled_date}
                                onChange={e => setNewPlan({...newPlan, scheduled_date: e.target.value})}
                                className="w-full p-3 bg-black border border-[#1a1a1a] text-[10px] text-white focus:border-blue-600 outline-none transition-all font-mono disabled:opacity-70 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Hora de Inicio</label>
                            <input 
                                type="time"
                                disabled={isViewMode}
                                value={newPlan.scheduled_time}
                                onChange={e => setNewPlan({...newPlan, scheduled_time: e.target.value})}
                                className="w-full p-3 bg-black border border-[#1a1a1a] text-[10px] text-white focus:border-blue-600 outline-none transition-all font-mono disabled:opacity-70 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Detalles y Logística</label>
                        <textarea 
                            value={newPlan.details}
                            disabled={isViewMode}
                            onChange={e => setNewPlan({...newPlan, details: e.target.value})}
                            className="w-full p-4 bg-black border border-[#1a1a1a] text-[10px] text-white focus:border-blue-600 outline-none min-h-[60px] resize-none transition-all leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed"
                            placeholder="ESPECIFIQUE RECURSOS, UBICACIÓN Y COORDINACIONES..."
                        />
                    </div>

                    <div className="space-y-4 border-t border-[#111] pt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UsersIcon size={12} className="text-blue-500" />
                                <label className="block text-[8px] font-black text-blue-500 uppercase tracking-[0.4em]">Coordinadores</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">{newPlan.collaborators.length} CÓMPLICES</span>
                                {!isViewMode && (
                                    <select 
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            const profileId = e.target.value;
                                            if (newPlan.collaborators.some(c => c.profile_id === profileId)) return;
                                            setNewPlan({
                                                ...newPlan,
                                                collaborators: [...newPlan.collaborators, { profile_id: profileId, contribution: '' }]
                                            });
                                            e.target.value = '';
                                        }}
                                        className="bg-exec-blue/10 border border-exec-blue/20 text-[8px] text-exec-blue px-3 py-1.5 outline-none uppercase font-black tracking-widest hover:bg-exec-blue/20 transition-all cursor-pointer"
                                    >
                                        <option value="" className="bg-black">+ Agregar coordinador</option>
                                        {profiles.filter(p => p.id !== selectedProfile.id).map(p => (
                                            <option key={p.id} value={p.id} className="bg-black">{p.fullName}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                            {newPlan.collaborators.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[#1a1a1a] bg-black/40">
                                    <UsersIcon size={20} className="text-gray-800 mb-2 opacity-50" />
                                    <p className="text-[8px] text-gray-700 italic font-mono uppercase tracking-[0.2em]">Sin coordinadores asignados</p>
                                </div>
                            ) : (
                                newPlan.collaborators.map((collab, idx) => {
                                    const p = profiles.find(pr => pr.id === collab.profile_id);
                                    return (
                                        <div key={idx} className="flex items-center gap-4 p-3 bg-black border border-[#1a1a1a] hover:border-exec-blue/30 transition-all group/item">
                                            <div className="relative">
                                                <img src={p?.avatarUrl} className="w-8 h-8 rounded-none border border-[#1a1a1a] object-cover" />
                                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-exec-blue"></div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] font-black text-white uppercase tracking-widest">{p?.fullName}</p>
                                                    <span className="text-[9px] text-exec-blue font-mono uppercase">ID: {p?.id.slice(0, 8)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-[3]">
                                                        <input 
                                                            type="text"
                                                            disabled={isViewMode}
                                                            value={collab.contribution}
                                                            onChange={(e) => {
                                                                const updated = newPlan.collaborators.map((c, i) => 
                                                                    i === idx ? { ...c, contribution: e.target.value } : c
                                                                );
                                                                setNewPlan({...newPlan, collaborators: updated});
                                                            }}
                                                            placeholder="EJ: TORTA, BEBIDAS, DECORACIÓN..."
                                                            className="w-full bg-transparent border border-[#1a1a1a] focus:border-exec-blue/50 text-[10px] text-white p-2 pl-3 outline-none transition-all font-mono uppercase placeholder:text-gray-800 disabled:opacity-70"
                                                        />
                                                    </div>
                                                    <select 
                                                        value={collab.status || 'Pendiente'}
                                                        disabled={isViewMode}
                                                        onChange={(e) => {
                                                            const updated = newPlan.collaborators.map((c, i) => 
                                                                i === idx ? { ...c, status: e.target.value } : c
                                                            );
                                                            setNewPlan({...newPlan, collaborators: updated});
                                                        }}
                                                        className="w-full bg-black border border-[#1a1a1a] text-[8px] text-gray-500 p-2 outline-none uppercase font-black tracking-tighter cursor-pointer focus:border-exec-blue/30 disabled:opacity-70"
                                                    >
                                                        <option value="Pendiente">PENDIENTE</option>
                                                        <option value="Confirmado">LISTO</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {!isViewMode && (
                                                <button 
                                                    onClick={() => {
                                                        const updated = newPlan.collaborators.filter((_, i) => i !== idx);
                                                        setNewPlan({...newPlan, collaborators: updated});
                                                    }}
                                                    className="p-2 text-gray-700 hover:text-red-500 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-red-500/30 transition-all"
                                                    title="ELIMINAR"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    </>
                )}

                <div className="flex gap-4 pt-4 border-t border-[#111] p-6">
                        <button 
                            onClick={() => setShowPlanModal(false)}
                            className="flex-1 py-3 border border-[#111] hover:border-[#1a1a1a] text-gray-600 hover:text-white text-[8px] font-black uppercase tracking-[0.2em] transition-all"
                        >
                            {isViewMode ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {isViewMode ? (
                            <button 
                                onClick={() => setIsViewMode(false)}
                                className="flex-[2] py-3 bg-white text-black hover:bg-gray-200 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={10} />
                                Habilitar Edición
                            </button>
                        ) : (
                            <button 
                                onClick={handlePlanSubmit}
                                className="flex-[2] py-3 bg-exec-blue hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                            >
                                {plans.some(pl => pl.profile_id === selectedProfile?.id && pl.year === viewingYear) ? 'Actualizar Plan' : 'Guardar Plan'}
                                <Zap size={10} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
