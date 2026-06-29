import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Mail, Lock, User, Briefcase, AlertCircle, CheckCircle } from 'lucide-react';
import { Role } from '../../types';

interface RegisterProps {
  onBackToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: '' as Role | '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles: Role[] = [
    "Director",
    "Subdirector",
    "Subdirectora",
    "Secretario",
    "Secretaria",
    "Jefe de Imagen",
    "Jefa de Imagen",
    "Auxiliar Técnico",
    "Auxiliar Técnica",
    "Gestor de Redes",
    "Gestora de Redes",
    "Coordinador de Eventos",
    "Coordinadora de Eventos",
    "Relaciones Institucionales",
    "Asesor",
    "Asesora",
    "CM- Equipo de comunicación y marketing-acs"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password || !formData.fullName || !formData.role) {
      setError('Todos los campos son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Crear el perfil inicial en public.profiles (Autoritativo)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            "fullName": formData.fullName,
            role: formData.role,
            status: 'Pendiente' // Los autoregistros quedan pendientes por defecto
          });

        if (profileError) {
          console.error('Error creating profile during register:', profileError);
          // No lanzamos error para no bloquear la pantalla de éxito de Auth
        }
      }

      setSuccess(true);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: '',
      });
    } catch (error: any) {
      setError(error.message || 'Error al registrarse. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/90 z-10 pointer-events-none"></div>
        <div className="max-w-md w-full bg-[#0A0A0A] border border-[#333333] rounded-none p-8 relative z-20 animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/10 rounded-full mb-6 border border-green-500/20">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-white mb-4 italic">¡Solicitud Enviada!</h2>
            <p className="text-gray-200 mb-8 font-light leading-relaxed text-sm uppercase tracking-widest">
              Tu solicitud de registro ha sido enviada al Director.
            </p>
            <button
              onClick={onBackToLogin}
              className="w-full bg-white text-black py-3 rounded-none font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all duration-300"
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-black overflow-hidden relative">
      {/* Left Side - Image */}
      <div className="hidden md:block md:w-1/2 relative bg-black h-screen overflow-hidden fixed left-0 top-0 z-0 animate-in fade-in slide-in-from-left duration-1000">
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/90 z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none"></div>

        {/* Background Image */}
        <img
          alt="Registro - Excelencia Académica"
          className="absolute inset-0 w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-10000 ease-out opacity-80"
          src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&h=1600&auto=format&fit=crop"
        />

        {/* Text Overlay */}
        <div className="absolute bottom-20 left-12 right-12 z-20 animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
          <h2 className="text-white font-serif text-5xl leading-tight mb-6 drop-shadow-[0_5px_30px_rgba(0,0,0,0.8)]">
            Se parte del Cambio Académico
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 bg-exec-blue shadow-[0_0_10px_#3b82f6]"></div>
            <p className="text-gray-300 font-bold text-[10px] tracking-[0.5em] uppercase">
              Facultad de Ciencias Sociales
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 md:ml-auto flex flex-col items-center p-8 lg:p-12 bg-black relative h-full overflow-y-auto z-10 animate-in fade-in slide-in-from-right duration-1000">
        <div className="w-full max-w-md space-y-6 my-auto pt-10 pb-10">
          <div className="text-center group">
            <div className="flex justify-center items-center gap-4 md:gap-6 mb-8 flex-wrap">
              <img src="/certificates/logo-facultad/logo-facultad.png" alt="Facultad" className="h-14 md:h-18 w-auto object-contain opacity-90 transition-all duration-500 hover:opacity-100" />
              <img src="/logo-iics.png" alt="IICS" className="h-14 md:h-18 w-auto object-contain transition-all duration-500 hover:scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
              <img src="/certificates/logo-unc/R.png" alt="UNC" className="h-14 md:h-18 w-auto object-contain opacity-90 transition-all duration-500 hover:opacity-100" />
            </div>

            <h1 className="text-3xl font-serif font-bold tracking-tight text-white mb-2 group-hover:text-exec-blue transition-colors duration-500">
              Registro de Usuario
            </h1>
            <p className="text-sm text-gray-300 font-medium tracking-wide">SDI-IICS / Sistema de Gestión</p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="h-0.5 w-12 bg-exec-blue/50 rounded-full group-hover:w-16 transition-all duration-500"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-exec-red/10 border border-exec-red/20 rounded-none p-4 flex items-start gap-3 animate-in shake duration-500">
                <AlertCircle className="w-5 h-5 text-exec-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-exec-red">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-1">Identidad Académica</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-exec-border bg-[#050505] text-white rounded-none focus:border-white transition-all duration-300 outline-none sm:text-sm"
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-exec-border bg-[#050505] text-white rounded-none focus:border-white transition-all duration-300 outline-none sm:text-sm"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative group">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-exec-border bg-[#050505] text-white rounded-none focus:border-white transition-all duration-300 outline-none sm:text-sm appearance-none"
                  >
                    <option value="" className="bg-black text-gray-500">Selecciona tu cargo</option>
                    {roles.map((role) => (
                      <option key={role} value={role} className="bg-black text-white">{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-exec-border bg-[#050505] text-white rounded-none focus:border-white transition-all duration-300 outline-none sm:text-sm"
                    placeholder="Contraseña"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="block w-full pl-10 pr-4 py-3 border border-exec-border bg-[#050505] text-white rounded-none focus:border-white transition-all duration-300 outline-none sm:text-sm"
                    placeholder="Repetir"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 rounded-none transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando Solicitud...' : 'Solicitar Registro'}
              </button>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-3 border border-exec-border text-gray-300 font-bold uppercase text-[9px] tracking-widest hover:text-white hover:border-white rounded-none transition-all duration-300"
              >
                ¿Ya tienes cuenta? Iniciar Sesión
              </button>
            </div>
          </form>

          <div className="mt-8 text-center pb-8 opacity-30">
            <p className="text-[8px] text-gray-200 uppercase tracking-[0.4em] font-medium">© 2026 SDI-IICS / INSTITUTO DE INVESTIGACIÓN CIENTÍFICA SOCIAL</p>
          </div>
        </div>
      </div>
    </div>
  );
};
