import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Link, useNavigate } from 'react-router-dom';

export const UpdatePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Las contraseñas no coinciden');
        }

        try {
            setMessage('');
            setError('');
            setLoading(true);
            const { error } = await updatePassword(password);
            if (error) throw error;
            setMessage('Contraseña actualizada exitosamente.');
            setTimeout(() => {
                navigate('/admin/login');
            }, 2000);
        } catch (err: any) {
            setError('No se pudo actualizar la contraseña. ' + (err.message || ''));
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
                        Actualizar Contraseña
                    </h2>
                    <p className="text-gray-200 font-light text-sm">
                        Ingresa tu nueva contraseña segura.
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
                        <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                            Nueva Contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="block w-full pl-10 pr-4 py-3 border border-[#333333] rounded-none bg-[#0A0A0A] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white sm:text-sm transition-all duration-200"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-200 mb-2">
                            Confirmar Contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-white transition-colors" />
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="block w-full pl-10 pr-4 py-3 border border-[#333333] rounded-none bg-[#0A0A0A] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white focus:border-white sm:text-sm transition-all duration-200"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black py-3 rounded-none font-semibold hover:bg-gray-200 focus:ring-4 focus:ring-gray-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
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
