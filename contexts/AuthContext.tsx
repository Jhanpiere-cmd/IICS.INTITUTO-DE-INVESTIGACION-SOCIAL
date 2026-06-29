import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = React.useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id, false); // Initial load might need loading, but usually handled by initial state
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        // Silent only for background updates
        const isBackgroundUpdate = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
        fetchUserProfile(session.user.id, isBackgroundUpdate);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, silent = false) => {
    try {
      // Only show global loading if we don't have a user yet AND it's not a silent update
      // Using ref to avoid stale closure in the onAuthStateChange callback
      if (!userRef.current && !silent) setLoading(true);

      // 1. Fetch profile data (Authoritative for the Agentic Interface)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, "fullName", "avatarUrl", email')
        .eq('id', userId)
        .single();

      // 2. Fallback to users table if profile is missing (legacy)
      let userData = null;
      if (!profileData) {
        const { data: uData } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        userData = uData;
      }

      if (userData || profileData) {
        // Fallback para avatar: Perfil DB -> Metadata -> UI Avatars
        let avatarFinal = profileData?.avatarUrl || profileData?.avatar_url || userData?.avatar_url;

        if (!avatarFinal) {
          const { data: sessionData } = await supabase.auth.getSession();
          const meta = sessionData.session?.user?.user_metadata;
          avatarFinal = meta?.avatar_url || meta?.picture;
        }

        setUser({
          id: userId,
          email: profileData?.email || userData?.email || session?.user?.email || '',
          fullName: profileData?.fullName || profileData?.full_name || userData?.full_name || session?.user?.user_metadata?.full_name || 'Usuario',
          role: profileData?.role || userData?.role || (session?.user?.user_metadata?.role as any) || 'Miembro',
          status: userData?.status || profileData?.status || 'Activo',
          avatarUrl: avatarFinal,
          department: startCase(profileData?.department || userData?.department),
          createdAt: new Date(profileData?.created_at || userData?.created_at || Date.now()),
          lastSeen: profileData?.last_seen ? new Date(profileData.last_seen) : undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCase = (str?: string) => {
    return str ? str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) : undefined;
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const getRedirectUrl = () => {
        // En producción (Netlify), siempre queremos redireccionar al dominio de Netlify
        // En desarrollo, a localhost:3000
        const origin = window.location.origin;
        console.log("[Auth] Calculando URL de redirección en origen:", origin);
        return origin;
      };

      const redirectUrl = getRedirectUrl();
      console.log("[Auth] Iniciando flujo Google OAuth con redirectTo:", redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        console.error('Error en Google OAuth:', error.message);
        throw error;
      }
      return { error: null };
    } catch (error) {
      console.error('Catch error en signInWithGoogle:', error);
      setLoading(false);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        // Silently fail to not interrupt UX
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // 1 minute heartbeat

    return () => clearInterval(interval);
  }, [user?.id]);

  const value = {
    user,
    session,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
