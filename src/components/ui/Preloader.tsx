import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FallingPattern } from './falling-pattern';
import { Terminal } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [percent, setPercent] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Progress increment timer
    const duration = 2800; // ~2.8 seconds total
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const nextPercent = Math.min(100, Math.floor((currentStep / steps) * 100));
      setPercent(nextPercent);

      if (nextPercent >= 100) {
        clearInterval(progressInterval);
        // Add final buffer delay for smooth transition
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, intervalTime);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  useEffect(() => {
    const newLogs = [];
    if (percent >= 0) {
      newLogs.push('// SYS.INIT // INICIANDO CONSOLA TERRITORIAL');
      newLogs.push('[SYS] Cargando variables de entorno...');
    }
    if (percent >= 15) {
      newLogs.push('[SYS] Núcleo cognitivo Cajamarca inicializado.');
      newLogs.push('[NET] Conectando con servidor geopolítico (7.159° S)...');
    }
    if (percent >= 40) {
      newLogs.push('[NET] Enlace de datos de 13 provincias establecido.');
      newLogs.push('[AI] Cargando modelos NLP BERT-IICS-V2...');
    }
    if (percent >= 65) {
      newLogs.push('[AI] Analizador semántico activo. Precisión: 88.5%.');
      newLogs.push('[SEC] Sincronizando firmas criptográficas y Becas AFI...');
    }
    if (percent >= 90) {
      newLogs.push('[SEC] Credenciales autorizadas para analistas del norte.');
      newLogs.push('[SYS] Configuración completa. Consola estable.');
    }
    setLogs(newLogs);
  }, [percent]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] bg-black w-screen h-screen flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none"
    >
      {/* Background Falling Code Patterns */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.12]">
        <FallingPattern 
          color="rgba(0, 153, 255, 0.15)" 
          backgroundColor="transparent"
          duration={120}
          blurIntensity="0px"
          density={0.8}
          className="h-full w-full"
        />
      </div>

      {/* Top Header high-tech metadata */}
      <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-[#0099ff]" />
          <span>IICS.SYSTEMS.BOOT_v4.1</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>LATENCY: 12ms</span>
          <span>ESTADO: CALIBRACIÓN</span>
        </div>
      </div>

      {/* Center Logo & Title Display */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
        {/* Pulsing neon logo */}
        <motion.div 
          animate={{ 
            scale: [1, 1.03, 1],
            filter: [
              'drop-shadow(0 0 10px rgba(0, 153, 255, 0.1))',
              'drop-shadow(0 0 25px rgba(0, 153, 255, 0.35))',
              'drop-shadow(0 0 10px rgba(0, 153, 255, 0.1))'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-24 w-24 flex items-center justify-center"
        >
          <img src="/logo-iics.png" alt="IICS Logo" className="h-20 w-20 object-contain" />
        </motion.div>

        {/* Brand Name Text animations */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-widest font-sans uppercase">
            IICS
          </h1>
          <motion.p 
            initial={{ letterSpacing: '0.05em', opacity: 0.7 }}
            animate={{ letterSpacing: '0.15em', opacity: 1 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="text-[9.5px] sm:text-[11px] font-bold text-cyan-400 uppercase font-sans tracking-[0.15em] mb-1"
          >
            Instituto de Investigación Científica Social
          </motion.p>

          <div className="h-px w-16 bg-[#0099ff]/30 mx-auto my-2" />

          {/* Premium welcoming hook */}
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-sm sm:text-base lg:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-cyan-400 font-sans tracking-wide uppercase max-w-md mx-auto leading-relaxed shadow-sm drop-shadow-[0_0_10px_rgba(0,153,255,0.15)]"
          >
            Bienvenidos al Futuro de la Investigación Social
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-[9px] sm:text-[10px] text-zinc-400 font-sans tracking-wide max-w-sm mx-auto leading-relaxed"
          >
            Evidencia Científica y Sociología de Precisión para el Desarrollo Regional
          </motion.p>
        </div>

        {/* Live Terminal logs display */}
        <div className="w-full max-w-sm h-36 bg-[#040405] border border-zinc-900/60 p-4 font-mono text-[9px] text-zinc-400 text-left overflow-y-auto space-y-1.5 scrollbar-none shadow-inner">
          {logs.map((log, index) => (
            <div 
              key={index}
              className={`${
                log.startsWith('[SYS]') 
                  ? 'text-cyan-400' 
                  : log.startsWith('[SEC]') 
                  ? 'text-emerald-400' 
                  : log.startsWith('//')
                  ? 'text-zinc-500 font-bold'
                  : 'text-zinc-400'
              }`}
            >
              {log}
            </div>
          ))}
          <motion.div 
            animate={{ opacity: [1, 0, 1] }} 
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block w-1.5 h-3 bg-[#0099ff] ml-1"
          />
        </div>
      </div>

      {/* Bottom Progress Bar & Percentage indicator */}
      <div className="relative z-10 w-full space-y-4 border-t border-zinc-900 pt-6">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-1.5 w-1.5 bg-[#0099ff] rounded-none animate-pulse"></span>
            <span>PROCESANDO COMPILACIÓN</span>
          </div>
          <div className="text-white font-bold tracking-widest">
            SYS.LOAD // {percent.toString().padStart(3, '0')}%
          </div>
        </div>

        {/* Sleek growing loading bar */}
        <div className="h-[2px] w-full bg-zinc-900 relative overflow-hidden rounded-none">
          <div 
            style={{ width: `${percent}%` }}
            className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-[#0099ff] shadow-[0_0_8px_#0099ff] transition-all duration-75"
          />
        </div>
      </div>
    </motion.div>
  );
}
