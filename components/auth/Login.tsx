import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, User, Lock, ArrowRight } from 'lucide-react';
import { Register } from './Register';
import { SmokeyBackground } from '../ui/SmokeyBackground';

export const Login: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message || 'Error al iniciar sesión con Google.');
    }
  };

  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />;
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col md:flex-row p-0">
      {/* Background Shader - Full Screen */}
      <SmokeyBackground className="absolute inset-0" backdropBlurAmount="md" />

      {/* Left Side: Identitarian Text - HIDDEN ON MOBILE to avoid overlap */}
      <div className="hidden md:flex relative z-10 w-1/2 h-full flex-col justify-center p-20 pointer-events-none select-none">
        <div className="space-y-6 animate-in fade-in slide-in-from-left duration-1000">
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-12 bg-exec-blue shadow-[0_0_10px_#3b82f6]"></div>
            <p className="text-exec-blue font-black text-[10px] tracking-[0.5em] uppercase">
              Conectando Ideas
            </p>
          </div>
          
          <h2 className="text-white font-serif text-6xl leading-tight drop-shadow-[0_5px_30px_rgba(0,0,0,0.5)]">
            Revista <span className="text-exec-blue">Alternativas</span> en Ciencias Sociales
          </h2>
          
          <div className="pt-4 border-t border-white/10 max-w-xs">
            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase italic">
              Equipo de comunicación y Marketing
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Card Container - Scrollable on mobile */}
      <div className="relative z-10 w-full md:w-1/2 h-full flex items-center justify-center md:justify-end overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-md p-6 md:p-8 space-y-6 bg-black/40 backdrop-blur-xl md:rounded-none border-x md:border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom md:slide-in-from-right duration-1000 my-auto md:mr-20">
          
          {/* Institutional Branding */}
          <div className="text-center space-y-6">
            <div className="flex justify-center items-center gap-4 flex-wrap">
              <img
                src="/certificates/logo-facultad/logo-facultad.png"
                alt="Facultad"
                className="h-10 md:h-12 w-auto object-contain opacity-90"
              />
              <img
                src="/certificates/logo-revista/logo-revista-ACS.png"
                alt="Revista ACS"
                className="h-12 md:h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              />
              <img
                src="/certificates/logo-unc/R.png"
                alt="UNC"
                className="h-10 md:h-12 w-auto object-contain opacity-90"
              />
            </div>
            
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1">
                SDI-IICS
              </h1>
              <p className="text-[9px] md:text-[10px] text-gray-200 font-bold uppercase tracking-[0.3em]">
                Sistema de Desarrollo e Investigación
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 mt-4 md:mt-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 flex items-start gap-3 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-6 md:space-y-8">
              {/* Email Input with Animated Label */}
              <div className="relative z-0">
                <input
                  type="email"
                  id="floating_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-500 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
                  placeholder=" " 
                  required
                />
                <label
                  htmlFor="floating_email"
                  className="absolute text-sm text-gray-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                >
                  <User className="inline-block mr-2 -mt-1" size={14} />
                  Correo Académico
                </label>
              </div>

              {/* Password Input with Animated Label */}
              <div className="relative z-0">
                <input
                  type="password"
                  id="floating_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-500 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
                  placeholder=" "
                  required
                />
                <label
                  htmlFor="floating_password"
                  className="absolute text-sm text-gray-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                >
                  <Lock className="inline-block mr-2 -mt-1" size={14} />
                  Contraseña
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link to="/admin/forgot-password" title="Recuperar acceso" className="text-[9px] md:text-[10px] text-gray-200 hover:text-white transition uppercase font-bold tracking-widest">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-none text-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Conectando...' : 'Conectar Sistema'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />}
            </button>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-gray-300 text-[8px] font-black tracking-widest">O CONTINUAR CON</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-none text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-300"
            >
              <svg className="w-4 h-4 mr-3" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"></path><path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"></path>
              </svg>
              Identidad Google
            </button>

            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="w-full py-3 border border-white/10 rounded-none text-gray-200 font-bold uppercase text-[9px] tracking-[0.3em] hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              Solicitar Registro
            </button>
          </form>

          <div className="pt-4 text-center opacity-40 pb-6">
            <p className="text-[8px] text-gray-500 uppercase tracking-[0.4em]">
              © 2026 SDI-IICS / INSTITUTO DE INVESTIGACIÓN CIENTÍFICA SOCIAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
