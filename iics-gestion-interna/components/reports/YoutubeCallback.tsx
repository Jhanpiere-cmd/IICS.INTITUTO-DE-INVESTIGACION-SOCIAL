import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { youtubeService } from '../../lib/youtube';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const YoutubeCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      if (!code) {
        setStatus('error');
        setError('No se recibió el código de autorización de Google.');
        return;
      }

      try {
        await youtubeService.exchangeCode(code);
        setStatus('success');
        // Redirigir después de 2 segundos de éxito
        setTimeout(() => {
          navigate('/reports?tab=youtube');
        }, 2000);
      } catch (err: any) {
        console.error('Error in YouTube Callback:', err);
        setStatus('error');
        setError(err.message || 'Error al conectar con YouTube.');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-black text-white">
      <div className="bg-[#0D0D0D] border border-[#262626] p-12 rounded-sm shadow-2xl max-w-md w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase tracking-widest mb-2">Conectando...</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
              Estamos validando tus credenciales con Google YouTube API.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase tracking-widest mb-2 text-emerald-500">¡Conexión Exitosa!</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
              El canal de YouTube ha sido vinculado correctamente a SGR-ACS. Redirigiendo...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6" />
            <h2 className="text-xl font-black uppercase tracking-widest mb-2 text-red-500">Error de Conexión</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-6">
              {error}
            </p>
            <button 
              onClick={() => navigate('/reports')}
              className="px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm hover:shadow-glow transition-all"
            >
              Volver a Reportes
            </button>
          </>
        )}
      </div>
      
      <div className="mt-12 text-[9px] font-bold text-gray-800 uppercase tracking-[0.4em]">
        YouTube Integration Engine v1.0
      </div>
    </div>
  );
};
