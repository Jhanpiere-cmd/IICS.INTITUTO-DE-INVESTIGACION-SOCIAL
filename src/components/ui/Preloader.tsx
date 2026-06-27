import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FallingPattern } from './falling-pattern';
import { Terminal } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

type LoaderPhase = 'intro' | 'loading' | 'outro';

export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<LoaderPhase>('intro');
  const [percent, setPercent] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Phase transition timings
  useEffect(() => {
    // 1. Intro phase takes 1.2 seconds
    const introTimeout = setTimeout(() => {
      setPhase('loading');
    }, 1200);

    return () => clearTimeout(introTimeout);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

    // 2. Loading phase: Progress increments from 0 to 100
    const duration = 2800; // ~2.8 seconds
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const nextPercent = Math.min(100, Math.floor((currentStep / steps) * 100));
      setPercent(nextPercent);

      if (nextPercent >= 100) {
        clearInterval(progressInterval);
        
        // Switch to outro phase
        setTimeout(() => {
          setPhase('outro');
        }, 300);
      }
    }, intervalTime);

    return () => clearInterval(progressInterval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'outro') {
      // 3. Outro phase takes 800ms, then triggers completion
      const outroTimeout = setTimeout(() => {
        onComplete();
      }, 800);
      return () => clearTimeout(outroTimeout);
    }
  }, [phase, onComplete]);

  // Terminal log simulation
  useEffect(() => {
    if (phase === 'intro') {
      setLogs([]);
      return;
    }
    
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
  }, [percent, phase]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] bg-black w-screen h-screen flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none"
    >
      {/* Background Falling Code Patterns (Hidden during outro/intro) */}
      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 pointer-events-none z-0"
          >
            <FallingPattern 
              color="rgba(0, 153, 255, 0.15)" 
              backgroundColor="transparent"
              duration={120}
              blurIntensity="0px"
              density={0.8}
              className="h-full w-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Massive watermark logo in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <motion.img 
          initial={{ scale: 1.15, opacity: 0 }}
          animate={
            phase === 'intro' 
              ? { scale: 1.15, opacity: 0 }
              : phase === 'loading' 
              ? { scale: 1, opacity: 0.05 } 
              : { scale: 0.85, opacity: 0 }
          }
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          src="/logo-iics.png" 
          alt="Watermark" 
          className="h-[55vh] w-[55vh] object-contain filter blur-[3px]"
        />
      </div>

      {/* Top Header high-tech metadata */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={phase === 'loading' ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-3"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-[#0099ff]" />
          <span>IICS.SYSTEMS.BOOT_v4.1</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>LATENCY: 12ms</span>
          <span>ESTADO: CALIBRACIÓN</span>
        </div>
      </motion.div>

      {/* Center Logo & Title Display */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
        
        {/* Pulsing neon logo with animated tech frame */}
        <div className="relative p-5">
          {/* Outer Cyberpunk Corners (Brackets) */}
          <motion.div 
            initial={{ opacity: 0, scale: 1.2 }}
            animate={phase === 'loading' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 border border-zinc-900/50 pointer-events-none"
          >
            {/* Top-Left */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/80" />
            {/* Top-Right */}
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/80" />
            {/* Bottom-Left */}
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/80" />
            {/* Bottom-Right */}
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/80" />
          </motion.div>

          {/* Inner Rotating Tech Scanner Ring */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase === 'loading' ? { opacity: 1, rotate: 360 } : { opacity: 0 }}
            transition={
              phase === 'loading' 
                ? { rotate: { duration: 15, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.6 } } 
                : { duration: 0.3 }
            }
            className="absolute inset-1.5 border border-dashed border-cyan-500/20 rounded-full pointer-events-none"
          />

          {/* Central Logo */}
          <motion.div 
            initial={{ scale: 12, y: 0, opacity: 0, filter: 'drop-shadow(0 0 0px rgba(0,0,0,0))' }}
            animate={
              phase === 'intro'
                ? { scale: 5, opacity: 1, filter: 'drop-shadow(0 0 35px rgba(0, 153, 255, 0.35))' }
                : phase === 'loading'
                ? { 
                    scale: 1, 
                    opacity: 1, 
                    filter: [
                      'drop-shadow(0 0 8px rgba(0, 153, 255, 0.1))',
                      'drop-shadow(0 0 22px rgba(0, 153, 255, 0.35))',
                      'drop-shadow(0 0 8px rgba(0, 153, 255, 0.1))'
                    ] 
                  }
                : { 
                    scale: 16, 
                    opacity: 0, 
                    filter: 'drop-shadow(0 0 60px rgba(0, 153, 255, 0.95))',
                    transition: { duration: 0.8, ease: 'easeIn' } 
                  }
            }
            transition={
              phase === 'loading'
                ? { filter: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.8, ease: 'easeInOut' } }
                : { duration: 1.1, ease: 'easeOut' }
            }
            className="h-20 w-20 flex items-center justify-center relative z-10"
          >
            <img src="/logo-iics.png" alt="IICS Logo" className="h-16 w-16 object-contain" />
          </motion.div>
        </div>

        {/* Brand Name & Taglines (Fade in during loading, out during outro) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={phase === 'loading' ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.6, delay: phase === 'loading' ? 0.2 : 0 }}
          className="space-y-3"
        >
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-widest font-sans uppercase">
            IICS
          </h1>
          <p className="text-[9.5px] sm:text-[11px] font-bold text-cyan-400 uppercase font-sans tracking-[0.15em] mb-1">
            Instituto de Investigación Científica Social
          </p>

          <div className="h-px w-16 bg-[#0099ff]/30 mx-auto my-2" />

          {/* Premium welcoming hook */}
          <h2 className="text-sm sm:text-base lg:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-cyan-400 font-sans tracking-wide uppercase max-w-md mx-auto leading-relaxed shadow-sm drop-shadow-[0_0_10px_rgba(0,153,255,0.15)]">
            Bienvenidos al Futuro de la Investigación Social
          </h2>
          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-sans tracking-wide max-w-sm mx-auto leading-relaxed">
            Evidencia Científica y Sociología de Precisión para el Desarrollo Regional
          </p>
        </motion.div>

        {/* Live Terminal logs display (Fade in during loading, out during outro) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={phase === 'loading' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, delay: phase === 'loading' ? 0.4 : 0 }}
          className="w-full max-w-sm h-36 bg-[#040405] border border-zinc-900/60 p-4 font-mono text-[9px] text-zinc-400 text-left overflow-y-auto space-y-1.5 scrollbar-none shadow-inner"
        >
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
          {phase === 'loading' && (
            <motion.div 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-1.5 h-3 bg-[#0099ff] ml-1"
            />
          )}
        </motion.div>
      </div>

      {/* Bottom Progress Bar & Percentage indicator */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={phase === 'loading' ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
        transition={{ duration: 0.6, delay: phase === 'loading' ? 0.3 : 0 }}
        className="relative z-10 w-full space-y-4 border-t border-zinc-900 pt-6"
      >
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
      </motion.div>
    </motion.div>
  );
}
