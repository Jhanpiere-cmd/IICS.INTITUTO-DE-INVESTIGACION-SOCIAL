import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  isEye?: boolean;
}

interface NeuralOrbProps {
  isThinking?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: number;
  userVolume?: number; // Volumen de voz del usuario (0-255)
}

const NeuralOrb: React.FC<NeuralOrbProps> = ({ 
  isThinking = false, 
  isSpeaking = false, 
  isListening = false,
  size = 200,
  userVolume = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>();
  const mouse = useRef({ x: 0, y: 0 });
  const [isExploded, setIsExploded] = useState(false);

  // Colores dinámicos
  const getOrbColor = (isEye = false) => {
    if (isListening) return isEye ? '#FFFFFF' : '#EF4444'; // Rojo con ojos blancos
    if (isThinking) return isEye ? '#FFFFFF' : '#3B82F6'; // Azul con ojos blancos
    if (isSpeaking) return '#FFFFFF'; // Blanco total
    return isEye ? '#FFFFFF' : '#60A5FA'; // Azul claro con ojos blancos
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particleCount = size > 150 ? 250 : 120;
    
    // Inicializar partículas en forma esférica inicial
    if (particles.current.length === 0) {
      particles.current = Array.from({ length: particleCount }, (_, i) => {
        const isEye = i < 16; // 16 partículas para un diseño minimalista (8 por ojo)
        return {
          x: (Math.random() - 0.5) * size,
          y: (Math.random() - 0.5) * size,
          z: (Math.random() - 0.5) * size,
          targetX: 0,
          targetY: 0,
          targetZ: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          size: isEye ? 3 : 1.2, // Ojos un poco más grandes para nitidez
          color: getOrbColor(isEye),
          isEye
        };
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = {
        x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
      };
    };

    const handleClick = () => {
      setIsExploded(true);
      particles.current.forEach(p => {
        p.vx = (Math.random() - 0.5) * 20;
        p.vy = (Math.random() - 0.5) * 20;
      });
      setTimeout(() => setIsExploded(false), 800);
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleClick);

    const render = () => {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = size * 0.4;
      const time = Date.now() * 0.002;

      particles.current.forEach((p, i) => {
        // --- 1. DEFINIR OBJETIVOS (FORMAS) ---
        if (isSpeaking) {
          // MODO ONDA SONORA (SONIC WAVE)
          const waveFreq = 0.05;
          const waveAmp = isSpeaking ? Math.sin(time * 5) * 30 : 10;
          p.targetX = ((i / particleCount) - 0.5) * size * 1.5;
          p.targetY = Math.sin(p.targetX * waveFreq + time * 10) * waveAmp;
          p.targetZ = 0;
        } else if (p.isEye) {
          // MODO ROSTRO MINIMALISTA (OJOS ESCANEANDO)
          const isLeftEye = i < 8; // Solo 8 partículas por ojo
          const eyeSide = isLeftEye ? -1 : 1; 
          const eyeCenterX = eyeSide * baseRadius * 0.45;
          const eyeCenterY = -baseRadius * 0.25;
          
          // Escaneo horizontal autónomo (de un lado a otro) + Seguimiento de mouse
          const autoScan = Math.sin(time * 0.5) * 15;
          const mouseWeight = mouse.current.x !== 0 || mouse.current.y !== 0 ? 1 : 0;
          
          p.targetX = eyeCenterX + (mouse.current.x * 20 * mouseWeight) + (autoScan * (1 - mouseWeight));
          p.targetY = eyeCenterY + (mouse.current.y * 10 * mouseWeight);
          p.targetZ = baseRadius * 0.7;
        } else {
          // MODO ESFERA NEURAL (IDLE / THINKING)
          const phi = Math.acos(-1 + (2 * i) / particleCount);
          const theta = Math.sqrt(particleCount * Math.PI) * phi;
          const r = baseRadius * (isThinking ? (0.8 + Math.sin(time * 2) * 0.1) : 1);
          
          p.targetX = r * Math.cos(theta) * Math.sin(phi);
          p.targetY = r * Math.sin(theta) * Math.sin(phi);
          p.targetZ = r * Math.cos(phi);
        }

        // --- 2. FÍSICAS Y MOVIMIENTO ---
        if (!isExploded) {
          const ease = 0.1;
          const volumeFactor = isListening ? (userVolume / 30) : 0;
          
          p.vx += (p.targetX - p.x) * ease;
          p.vy += (p.targetY - p.y) * ease;
          p.vz += (p.targetZ - p.z) * ease;
          
          // Reacción al volumen del usuario
          if (isListening && !p.isEye) {
            p.x += (Math.random() - 0.5) * volumeFactor;
            p.y += (Math.random() - 0.5) * volumeFactor;
          }

          p.vx *= 0.8;
          p.vy *= 0.8;
          p.vz *= 0.8;
        } else {
          p.vx *= 0.95;
          p.vy *= 0.95;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // --- 3. RENDERIZADO ---
        const perspective = 300 / (300 + p.z);
        const screenX = centerX + p.x * perspective;
        const screenY = centerY + p.y * perspective;
        const screenRadius = Math.max(0.1, p.size * perspective);

        ctx.beginPath();
        ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
        
        // Color dinámico según profundidad y estado
        const alpha = Math.max(0.2, perspective - 0.5);
        ctx.fillStyle = p.isEye && isListening ? `rgba(255,255,255,${alpha + 0.3})` : getOrbColor(p.isEye);
        
        ctx.fill();
        
        // Brillo para ojos o pensamiento intenso
        if ((isThinking || (isListening && p.isEye)) && perspective > 1) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = getOrbColor(p.isEye);
        } else {
          ctx.shadowBlur = 0;
        }
      });

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleClick);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isThinking, isSpeaking, isListening, size, isExploded]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={size * 1.5} 
        height={size * 1.5} 
        style={{ width: size, height: size }}
        className="cursor-pointer transition-transform duration-500 hover:scale-105"
      />
    </div>
  );
};

export default NeuralOrb;
