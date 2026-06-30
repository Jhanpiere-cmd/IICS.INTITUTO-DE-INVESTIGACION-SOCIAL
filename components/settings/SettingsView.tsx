import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { googleAuthService } from '../../lib/googleAuth';
import { youtubeService } from '../../lib/youtube';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import {
  User, Mail, Briefcase, Camera, Moon, Sun, Save, X, Cake,
  Users as UsersIcon, Book, Palette, Lock, Shield,
  Smartphone, Info, ChevronRight, LogOut, CheckCircle, AlertCircle, Settings, Sparkles
} from 'lucide-react';
import { AboutSystem } from './AboutSystem';
import { Theme, applyTheme, loadTheme, saveTheme, THEME_LABELS, THEME_DESCRIPTIONS } from '../../utils/theme';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [profile, setProfile] = useState({
    fullName: '',
    role: '',
    avatar_url: '',
    phone: '',
    bio: '',
    birth_date: '',
    ai_token: '',
  });
  const [mobileTab, setMobileTab] = useState<'grid' | 'profile' | 'security' | 'theme' | 'google' | 'about'>('grid');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      // First load basic profile info
      const { data, error } = await supabase
        .from('profiles')
        .select('"fullName", role, "avatarUrl", phone, bio, birth_date')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      const newProfileState = {
        fullName: data.fullName || user?.fullName || '',
        role: user?.role || data.role || '',
        avatar_url: data.avatarUrl || '',
        phone: data.phone || '',
        bio: data.bio || '',
        birth_date: data.birth_date || '',
        ai_token: '',
      };

      setProfile(newProfileState);

      // Try to load ai_token in a separate query so it doesn't crash the load if the column doesn't exist yet
      try {
        const { data: aiData } = await supabase
          .from('profiles')
          .select('ai_token')
          .eq('id', user.id)
          .single();
        
        if (aiData) {
          setProfile(prev => ({ ...prev, ai_token: aiData.ai_token || '' }));
        }
      } catch (aiError) {
        console.warn('ai_token is not supported in the database schema yet:', aiError);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
      // Fallback to user context if profile fails
      setProfile({
        fullName: user?.fullName || '',
        role: user?.role || '',
        avatar_url: user?.avatarUrl || '',
        phone: '',
        bio: '',
        birth_date: '',
        ai_token: '',
      });
    }
  };

  const loadThemeSettings = () => {
    const savedTheme = loadTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
  };



  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    setToast({ type: 'success', msg: `Tema ${THEME_LABELS[newTheme]} activado` });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validate file type - accept common image formats
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setToast({ type: 'error', msg: 'Solo se permiten imágenes (JPG, PNG, GIF, WEBP)' });
      return;
    }

    setUploading(true);

    // Show preview immediately using local URL
    const localUrl = URL.createObjectURL(file);
    setProfile({ ...profile, avatar_url: localUrl });

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user?.id}.${fileExt}`;

      // Upload to public bucket with upsert to replace old image
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '300',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'Error al subir la imagen');
      }

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatarUrl: finalUrl })
        .eq('id', user?.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Error al actualizar el perfil');
      }

      // Update with final URL
      setProfile({ ...profile, avatar_url: finalUrl });
      setToast({ type: 'success', msg: '¡Foto actualizada!' });

      // Clean up local URL
      URL.revokeObjectURL(localUrl);
    } catch (e: any) {
      console.error('Avatar upload error:', e);
      setToast({ type: 'error', msg: e.message || 'Error al subir. Intenta de nuevo.' });
      // Reload original profile on error
      await loadProfile();
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let { error } = await supabase
        .from('profiles')
        .update({
          "fullName": profile.fullName,
          phone: profile.phone,
          bio: profile.bio,
          birth_date: profile.birth_date || null,
          ai_token: profile.ai_token,
        })
        .eq('id', user?.id);

      if (error) {
        // If error is about the missing column, fallback to update without ai_token
        if (error.message?.includes('ai_token') || error.code === 'PGRST204' || String(error.details || '').includes('ai_token')) {
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({
              "fullName": profile.fullName,
              phone: profile.phone,
              bio: profile.bio,
              birth_date: profile.birth_date || null,
            })
            .eq('id', user?.id);
          
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
      setToast({ type: 'success', msg: 'Perfil actualizado correctamente' });
    } catch (e: any) {
      setToast({ type: 'error', msg: `Error: ${e?.message || 'No se pudo actualizar'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validaciones
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setToast({ type: 'error', msg: 'Por favor completa todos los campos' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setToast({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ type: 'error', msg: 'Las contraseñas no coinciden' });
      return;
    }

    setChangingPassword(true);
    try {
      // Actualizar contraseña en Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      // Enviar email de confirmación
      setToast({ type: 'success', msg: 'Contraseña actualizada correctamente. Revisa tu email para confirmar.' });

      // Limpiar campos
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordSection(false);
    } catch (e: any) {
      console.error('Password change error:', e);
      setToast({ type: 'error', msg: e.message || 'Error al cambiar la contraseña' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setToast({ type: 'success', msg: '¡Email enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.' });
    } catch (e: any) {
      console.error('Password reset email error:', e);
      setToast({ type: 'error', msg: e.message || 'Error al enviar el email' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="w-full bg-black min-h-screen p-4 md:pt-4 md:px-6 text-exec-slate custom-scrollbar animate-in fade-in duration-700">
      
      {/* Desktop View */}
      <div className="hidden md:block space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
              <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                <Settings className="w-6 h-6 text-exec-blue" />
              </div>
              <span>Configuración <span className="text-exec-blue">Sistema</span></span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">Personaliza tu perfil y preferencias ejecutivas de alto nivel.</p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <Shield className="w-4 h-4 text-exec-blue" /> Seguridad de Nivel Enterprise
          </div>
        </div>

        {toast && (
          <div className={`fixed top-8 right-8 z-[200] px-6 py-4 rounded-none border shadow-2xl animate-in slide-in-from-right-8 duration-300 flex items-center gap-4 ${toast.type === 'success'
              ? 'bg-[#0D0D0D] border-green-500/20 text-green-400'
              : 'bg-[#0D0D0D] border-red-500/20 text-red-400'
            }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-[10px] font-bold uppercase tracking-widest">{toast.msg}</span>
          </div>
        )}

        {/* Perfil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-none overflow-hidden shadow-2xl relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-exec-blue transform scale-y-0 group-hover:scale-y-100 transition-transform duration-500"></div>
              <div className="p-6 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Información del Perfil</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 italic">Actualiza tu identidad en el sistema</p>
                </div>
                <User className="w-5 h-5 text-exec-blue/50" />
              </div>

              <div className="p-6 space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-10">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="relative w-32 h-32 rounded-full object-cover border-2 border-white/10 ring-4 ring-black"
                      />
                    ) : (
                      <div className="relative w-32 h-32 rounded-full bg-[#151515] border-2 border-white/10 flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-700" />
                      </div>
                    )}
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-1 right-1 bg-exec-blue text-white p-2.5 rounded-full cursor-pointer hover:bg-blue-500 transition-all shadow-xl hover:scale-110 active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white uppercase tracking-tighter notranslate" translate="no">{profile.fullName || 'Sin Nombre'}</p>
                    <p className="text-[10px] font-bold text-exec-blue uppercase tracking-[0.2em] mt-2">{profile.role || 'Rol no definido'}</p>
                    {uploading && (
                      <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                        Procesando Imagen...
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Nombre */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
                    <div className="relative group/input">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-exec-blue transition-colors" />
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none notranslate"
                        translate="no"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teléfono de Contacto</label>
                    <div className="relative group/input">
                      <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-exec-blue transition-colors" />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="+51 999 999 999"
                      />
                    </div>
                  </div>

                  {/* Fecha de Nacimiento */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha de Nacimiento</label>
                    <div className="relative group/input">
                      <Cake className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within/input:text-exec-blue transition-colors" />
                      <input
                        type="date"
                        value={profile.birth_date}
                        onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Biografía Ejecutiva</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full p-6 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none min-h-[140px] resize-none"
                    placeholder="Describe brevemente tu trayectoria o funciones..."
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="px-12 py-4 bg-exec-blue hover:bg-blue-500 text-white rounded-none transition-all text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-900/10 flex items-center gap-4 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Seguridad */}
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-none overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Seguridad</h3>
                <Lock className="w-4 h-4 text-exec-blue/50" />
              </div>
              <div className="p-6 space-y-6">
                {!showPasswordSection ? (
                  <div className="space-y-6">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest leading-relaxed italic">
                      Gestiona el acceso seguro a tu terminal SGR-ACS.
                    </p>
                    <div className="space-y-4">
                      <button
                        onClick={() => setShowPasswordSection(true)}
                        className="w-full px-6 py-4 bg-[#151515] border border-[#262626] text-white rounded-none hover:border-blue-500/30 transition-all text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-between group"
                      >
                        Actualizar Contraseña
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-exec-blue transition-colors" />
                      </button>
                      <button
                        onClick={handleSendPasswordResetEmail}
                        disabled={changingPassword}
                        className="w-full px-6 py-4 bg-transparent border border-blue-500/20 text-blue-400 rounded-none hover:bg-blue-500/5 transition-all text-[10px] font-bold uppercase tracking-[0.2em] disabled:opacity-50"
                      >
                        {changingPassword ? 'Enviando Protocolo...' : 'Enlace de Restablecimiento'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-exec-blue uppercase tracking-widest">Protocolo de Cambio</p>
                      <button
                        onClick={() => {
                          setShowPasswordSection(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="p-1.5 hover:bg-white/5 rounded-none transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-4 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:border-blue-500/50 outline-none"
                        placeholder="Nueva Contraseña"
                      />
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-4 bg-[#151515] border border-[#262626] rounded-none text-sm text-white focus:border-blue-500/50 outline-none"
                        placeholder="Confirmar Contraseña"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full px-6 py-4 bg-exec-blue hover:bg-blue-500 text-white rounded-none transition-all text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20"
                    >
                      {changingPassword ? 'Procesando...' : 'Cambiar Ahora'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Google Workspace Integration */}
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-none overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <svg viewBox="0 0 24 24" className="w-12 h-12 grayscale group-hover:grayscale-0 transition-all">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div className="p-6 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Google Workspace</h3>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest leading-relaxed">
                  Conecta tu cuenta para habilitar **Google Meet, Calendar y Docs** en HOYR AI.
                </p>
                <button
                  onClick={() => window.location.href = googleAuthService.getAuthUrl()}
                  className="w-full px-6 py-4 bg-white hover:bg-[#f1f1f1] text-black rounded-none transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 group"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Vincular Cuenta Google
                </button>
                <div className="pt-2 flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-[8px] font-bold text-green-500/70 uppercase tracking-tighter">
                     <CheckCircle size={10} /> Google Calendar & Meet v1.0
                   </div>
                   <div className="flex items-center gap-2 text-[8px] font-bold text-green-500/70 uppercase tracking-tighter">
                     <CheckCircle size={10} /> Google Docs & Drive v1.0
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apariencia */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-6 bg-exec-blue"></div>
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Configuración de Visibilidad</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <button
              onClick={() => handleThemeChange('light')}
              className={`group relative p-6 border border-[#262626] rounded-none transition-all overflow-hidden ${theme === 'light' ? 'bg-[#151515] ring-2 ring-exec-blue/50' : 'bg-[#0D0D0D] hover:bg-[#151515] hover:border-exec-blue/30'}`}
            >
              <Sun className={`w-8 h-8 mb-4 transition-all ${theme === 'light' ? 'text-yellow-500' : 'text-gray-700 group-hover:text-gray-400'}`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2">Modo Claro</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{THEME_DESCRIPTIONS.light}</p>
            </button>

            <button
              onClick={() => handleThemeChange('dark')}
              className={`group relative p-6 border border-[#262626] rounded-none transition-all overflow-hidden ${theme === 'dark' ? 'bg-[#151515] ring-2 ring-exec-blue/50' : 'bg-[#0D0D0D] hover:bg-[#151515] hover:border-exec-blue/30'}`}
            >
              <Moon className={`w-8 h-8 mb-4 transition-all ${theme === 'dark' ? 'text-exec-blue' : 'text-gray-700 group-hover:text-gray-400'}`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2">Modo Oscuro</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{THEME_DESCRIPTIONS.dark}</p>
            </button>

            <button
              onClick={() => handleThemeChange('dark-black')}
              className={`group relative p-6 border border-[#262626] rounded-none transition-all overflow-hidden ${theme === 'dark-black' ? 'bg-[#151515] ring-2 ring-exec-blue/50' : 'bg-[#0D0D0D] hover:bg-[#151515] hover:border-exec-blue/30'}`}
            >
              <Palette className={`w-8 h-8 mb-4 transition-all ${theme === 'dark-black' ? 'text-exec-blue' : 'text-gray-700 group-hover:text-gray-400'}`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 text-exec-blue">Stitch Ultra Modern</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">{THEME_DESCRIPTIONS['dark-black']}</p>
            </button>
          </div>
        </div>

        {/* AI External Token Integration - BETA */}
        <div className="pt-8 border-t border-exec-border">
          <div className="bg-[#0D0D0D] border border-exec-blue/20 rounded-none overflow-hidden shadow-2xl relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-16 h-16 text-exec-blue" />
            </div>
            <div className="p-6 border-b border-exec-blue/10 bg-exec-blue/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined notranslate text-exec-blue animate-pulse" translate="no">smart_toy</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Conexión IA Externa <span className="text-exec-blue font-black text-[8px] border border-exec-blue px-1 ml-2">BETA</span></h3>
              </div>
              <p className="text-[9px] font-black text-exec-blue uppercase tracking-widest">Protocolo v1.0.b</p>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs font-medium leading-relaxed">
                    Sincroniza el SGR-ACS con **ChatGPT Plus (GPTs)** o **Gemini Pro**. Este token permite que IAs externas consulten tus tareas, lean tus documentos en el Drive y te asistan proactivamente.
                  </p>
                  <ul className="space-y-2">
                    {['Lectura de tareas pendientes', 'Análisis de documentos institucionales', 'Redacción agéntica de oficios', 'Asistente personal 24/7'].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        <div className="w-1 h-1 bg-exec-blue"></div> {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-black/40 border border-[#262626] p-6 space-y-6 flex flex-col justify-center">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-exec-blue uppercase tracking-widest">Tu Token de Acceso Secreto</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-[#111] border border-[#262626] p-3 text-xs font-mono text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                        {profile.ai_token ? (
                          <span className="text-exec-blue">ACS_TOKEN_••••••••••••••••</span>
                        ) : (
                          "NO GENERADO"
                        )}
                      </div>
                      <button 
                        onClick={async () => {
                          const newToken = 'ACS_' + Math.random().toString(36).substring(2, 12).toUpperCase() + '_' + Math.random().toString(36).substring(2, 12).toUpperCase();
                          setLoading(true);
                          try {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ ai_token: newToken })
                              .eq('id', user?.id);
                            
                            if (error) throw error;
                            
                            setProfile({...profile, ai_token: newToken});
                            setToast({ type: 'success', msg: 'Protocolo IA Activado: Token Guardado' });
                          } catch (e: any) {
                            setToast({ type: 'error', msg: 'Error al activar protocolo: ' + e.message });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="px-4 bg-exec-blue hover:bg-blue-500 text-white text-[10px] font-bold uppercase transition-colors disabled:opacity-50"
                      >
                        {profile.ai_token ? "Regenerar" : "Generar"}
                      </button>
                    </div>
                  </div>
                  <p className="text-[8px] text-gray-600 font-medium leading-normal">
                    <span className="text-red-500 font-bold uppercase">ADVERTENCIA:</span> No compartas este token con nadie. Permite el acceso total a tu perfil a través de servicios de IA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acerca del Sistema */}
        <div className="pt-12">
          {!showFullAbout ? (
            <div className="bg-[#0D0D0D] border border-[#262626] rounded-none overflow-hidden shadow-2xl p-8 flex flex-col md:flex-row items-center gap-10">
              <div className="p-5 bg-exec-blue/10 border border-exec-blue/20 rounded-none">
                <Book className="w-10 h-10 text-exec-blue" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Documentación Central del Sistema</h3>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed max-w-2xl">
                  Accede a los lineamientos operativos, objetivos estratégicos y la conformación oficial del equipo SGR-ACS.
                </p>
              </div>
              <button
                onClick={() => setShowFullAbout(true)}
                className="px-8 py-4 bg-[#151515] border border-exec-blue/30 text-white rounded-none hover:bg-exec-blue transition-all text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl active:scale-95"
              >
                Ingresar a Documentación
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-start mb-8">
                <button
                  onClick={() => setShowFullAbout(false)}
                  className="px-6 py-3 bg-[#151515] border border-[#262626] text-gray-400 hover:text-white rounded-none transition-all flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest group"
                >
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  Regresar a Configuración
                </button>
              </div>
              <AboutSystem />
            </div>
          )}
        </div>

        <div className="pt-24 pb-12 border-t border-[#262626] flex justify-center">
          <div className="text-center space-y-4">
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.5em]">Enterprise Edition v2.0</p>
            <p className="text-[8px] font-medium text-gray-700 uppercase tracking-widest">© 2026 Sistema oficial de Gestión ACS. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>

      {/* Mobile View - Box Strategy (3x3 Grid) */}
      <div className="md:hidden space-y-6">
        {mobileTab === 'grid' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center border-b border-[#262626] pb-6">
              <div>
                <h1 className="text-[8px] font-bold text-exec-blue uppercase tracking-widest mb-1">Terminal SGR-ACS</h1>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">AJUSTES</h2>
              </div>
              <div className="w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center">
                <Shield className="w-4 h-4 text-exec-blue" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setMobileTab('profile')}
                className="aspect-square bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-gray-500 hover:text-white group"
              >
                <User className="w-5 h-5 group-hover:text-exec-blue transition-colors" />
                <span className="text-[7px] font-black uppercase tracking-tight">Mi Perfil</span>
                <span className="text-[5px] text-gray-600 font-bold uppercase tracking-tighter group-hover:text-blue-400/50">Identidad</span>
              </button>
              <button 
                onClick={() => setMobileTab('security')}
                className="aspect-square bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-gray-500 hover:text-white group"
              >
                <Lock className="w-5 h-5 group-hover:text-exec-blue transition-colors" />
                <span className="text-[7px] font-black uppercase tracking-tight">Acceso</span>
                <span className="text-[5px] text-gray-600 font-bold uppercase tracking-tighter group-hover:text-blue-400/50">Seguridad</span>
              </button>
              <button 
                onClick={() => setMobileTab('theme')}
                className="aspect-square bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-gray-500 hover:text-white group"
              >
                <Palette className="w-5 h-5 group-hover:text-exec-blue transition-colors" />
                <span className="text-[7px] font-black uppercase tracking-tight">Diseño</span>
                <span className="text-[5px] text-gray-600 font-bold uppercase tracking-tighter group-hover:text-blue-400/50">Apariencia</span>
              </button>
              <button 
                onClick={() => setMobileTab('google')}
                className="aspect-square bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-gray-500 hover:text-white group"
              >
                <Mail className="w-5 h-5 group-hover:text-exec-blue transition-colors" />
                <span className="text-[7px] font-black uppercase tracking-tight">Google</span>
                <span className="text-[5px] text-gray-600 font-bold uppercase tracking-tighter group-hover:text-blue-400/50">Youtube API</span>
              </button>
              <button 
                onClick={() => setMobileTab('about')}
                className="aspect-square bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-gray-500 hover:text-white group"
              >
                <Book className="w-5 h-5 group-hover:text-exec-blue transition-colors" />
                <span className="text-[7px] font-black uppercase tracking-tight">Manual</span>
                <span className="text-[5px] text-gray-600 font-bold uppercase tracking-tighter group-hover:text-blue-400/50">Estrategia</span>
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="aspect-square bg-[#0D0D0D] border border-[#262626] rounded-none p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-gray-500 hover:text-white group"
              >
                <Smartphone className="w-5 h-5 group-hover:text-exec-blue transition-colors" />
                <span className="text-[7px] font-black uppercase tracking-tight">Sistema</span>
                <span className="text-[5px] text-gray-600 font-bold uppercase tracking-tighter group-hover:text-blue-400/50">Versión 2.0</span>
              </button>
            </div>

            <div className="pt-12 flex justify-center opacity-30">
              <p className="text-[7px] font-bold text-gray-600 uppercase tracking-[0.5em]">Enterprise v2.0</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6 pb-20">
            <button 
              onClick={() => setMobileTab('grid')}
              className="flex items-center gap-2 text-[8px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors py-2"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> REGRESAR
            </button>

            {mobileTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-[#0D0D0D] border border-[#262626] rounded-none">
                  <div className="relative">
                    <img src={profile.avatar_url || ''} className="w-16 h-16 rounded-full object-cover border border-[#262626]" alt="" />
                    <label htmlFor="avatar-mobile" className="absolute -bottom-1 -right-1 bg-exec-blue p-1.5 rounded-full"><Camera className="w-3 h-3 text-white" /></label>
                    <input id="avatar-mobile" type="file" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase notranslate" translate="no">{profile.fullName || 'Sin Nombre'}</h3>
                    <p className="text-[9px] text-exec-blue font-bold uppercase tracking-widest">{profile.role}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Nombre</label>
                    <input type="text" value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none p-3 text-[10px] text-white outline-none notranslate" translate="no" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">WhatsApp</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none p-3 text-[10px] text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Bio</label>
                    <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none p-3 text-[10px] text-white outline-none min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Fecha de Nacimiento</label>
                    <input type="date" value={profile.birth_date} onChange={e => setProfile({...profile, birth_date: e.target.value})} className="w-full bg-[#0D0D0D] border border-[#262626] rounded-none p-3 text-[10px] text-white outline-none" />
                  </div>
                </div>

                <button onClick={handleSaveProfile} disabled={loading} className="w-full py-4 bg-exec-blue text-white text-[10px] font-black uppercase tracking-widest rounded-none">
                  {loading ? 'G U A R D A N D O...' : 'G U A R D A R'}
                </button>
              </div>
            )}

            {mobileTab === 'theme' && (
              <div className="space-y-4">
                <button onClick={() => handleThemeChange('dark-black')} className={`w-full p-4 border rounded-none flex items-center justify-between ${theme === 'dark-black' ? 'bg-[#151515] border-blue-500/50' : 'bg-[#0D0D0D] border-[#262626]'}`}>
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-exec-blue" />
                    <span className="text-[10px] font-black text-white uppercase">Stitch Ultra</span>
                  </div>
                  {theme === 'dark-black' && <CheckCircle className="w-4 h-4 text-exec-blue" />}
                </button>
                <button onClick={() => handleThemeChange('dark')} className={`w-full p-4 border rounded-none flex items-center justify-between ${theme === 'dark' ? 'bg-[#151515] border-blue-500/50' : 'bg-[#0D0D0D] border-[#262626]'}`}>
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] font-black text-white uppercase">Modo Oscuro</span>
                  </div>
                  {theme === 'dark' && <CheckCircle className="w-4 h-4 text-exec-blue" />}
                </button>
              </div>
            )}

            {mobileTab === 'security' && (
              <div className="space-y-6">
                 <button onClick={handleSendPasswordResetEmail} disabled={changingPassword} className="w-full p-6 bg-[#0D0D0D] border border-[#262626] rounded-none text-center">
                    <Lock className="w-6 h-6 text-exec-blue mx-auto mb-3" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Enviar Reset Password Email</span>
                 </button>
              </div>
            )}

            {mobileTab === 'google' && (
              <div className="space-y-6">
                <div className="p-6 bg-[#0D0D0D] border border-[#262626] rounded-none space-y-5">
                  <div className="flex justify-between items-start">
                    <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" className="w-10 h-10" />
                    <Mail className="w-5 h-5 text-exec-blue/50" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-tighter">Google Workspace</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                      Habilita el control agéntico sobre tu Calendario, Meet y Documentos con tu cuenta oficial.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.href = googleAuthService.getAuthUrl()}
                    className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-none flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="" className="w-4 h-4" />
                    Vincular Ahora
                  </button>
                </div>
              </div>
            )}

            {mobileTab === 'about' && (
              <div className="scale-90 origin-top">
                <AboutSystem />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
