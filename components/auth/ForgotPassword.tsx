import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Link } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage('Revisa tu bandeja de entrada para continuar con el restablecimiento de contraseña.');
    } catch (err: any) {
      setError('No se pudo restablecer la contraseña. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#0A0A0A] border border-[#333333] rounded-none shadow-2xl p-8 relative z-20">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo useImage={true} size={80} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">
            Recuperar Contraseña
          </h2>
          <p className="text-gray-200 font-light text-sm">
            Ingresa tu correo electrónico y te enviaremos instrucciones.
          </p>
        </div>

        {error && (
          <div className="bg-[#1A1A1A] border border-red-900/50 rounded-none p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-[#1A1A1A] border border-green-900/50 rounded-none p-4 flex items-start gap-3 mb-6">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-300">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
              Correo Electrónico
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-10 pr-4 py-3 border border-[#333333] rounded-none bg-[#0A0A0A] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white sm:text-sm transition-all duration-200"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-none font-semibold hover:bg-gray-200 focus:ring-4 focus:ring-gray-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#333333] pt-6">
          <Link to="/admin/login" className="inline-flex items-center text-sm text-gray-200 hover:text-white font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-center w-full z-20">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest opacity-50 font-medium">
          © 2026 SDI-IICS System
        </p>
      </div>
    </div>
  );
};
