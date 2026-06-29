import { motion } from 'motion/react';
import React from 'react';

interface VocalWavesProps {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  color?: string;
}

export const VocalWaves: React.FC<VocalWavesProps> = ({ 
  isConnected, 
  isSpeaking, 
  isListening, 
  color = '#00F0FF' 
}) => {
  const numBars = 12; // Aumentamos para mayor densidad visual

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none opacity-40">
      {Array.from({ length: numBars }).map((_, i) => {
        let animate: any = { height: "4px", opacity: 0.1 };
        let transition: any = { duration: 0.5 };

        if (isConnected) {
          if (isSpeaking) {
            // Ondas activas de habla: erráticas y altas
            const heights = [
              ["10%", "60%", "20%", "80%", "30%"],
              ["30%", "90%", "10%", "70%", "40%"],
              ["50%", "20%", "90%", "30%", "70%"],
            ];
            animate = { height: heights[i % heights.length], opacity: 0.8 };
            transition = { 
              repeat: Infinity, 
              duration: 0.3 + (i % 3) * 0.1, 
              repeatType: "mirror",
              ease: "easeInOut"
            };
          } else if (isListening) {
            // Ondas suaves de escucha: fluidas y bajas
            animate = { height: ["10%", "25%", "10%"], opacity: 0.4 };
            transition = { 
              repeat: Infinity, 
              duration: 1.5, 
              delay: i * 0.1,
              repeatType: "mirror",
              ease: "easeInOut"
            };
          }
        }

        return (
          <motion.div
            key={i}
            animate={animate}
            transition={transition}
            className="w-1.5 rounded-full"
            style={{ 
              backgroundColor: color,
              boxShadow: `0 0 15px ${color}`,
              originY: 0.5 
            }}
          />
        );
      })}
    </div>
  );
};
